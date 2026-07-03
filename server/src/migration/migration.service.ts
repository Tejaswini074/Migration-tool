import { v4 as uuid } from "uuid";
import mappingService from "../Mapping/mapping.service";
import runHistoryService, { FailedRowInput } from "./runHistory.service";
import { resolveTableOrder } from "./dependencyOrder";
import { IConnector } from "../connectors/types";

const DEFAULT_BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 5000;
const ROW_RETRY_ATTEMPTS = 2;
const ROW_RETRY_DELAY_MS = 150;

type Status = "pending" | "running" | "completed" | "completed_with_errors" | "failed" | "skipped";

interface TableRunState {
    tableMappingId: number;
    sourceTable: string;
    destinationTable: string;
    status: Status;
    totalRows: number;
    migratedRows: number;
    failedRows: number;
    error: string | null;
}

interface RunState {
    runId: string;
    dbId: number;
    projectId: number;
    status: "running" | "completed" | "completed_with_errors" | "failed";
    startedAt: string;
    finishedAt: string | null;
    tables: TableRunState[];
}

interface StartedBy {
    userId: number;
    name: string;
    email: string;
}

interface StartParams {
    project: any;
    sourceConnection: IConnector;
    destinationConnection: IConnector;
    startedBy: StartedBy;
    batchSize?: number;
}

const applyTransform = (value: any, rule?: string | null) => {
    if (value === null || value === undefined) return value;

    switch (rule) {
        case "uppercase":
            return String(value).toUpperCase();
        case "lowercase":
            return String(value).toLowerCase();
        case "trim":
            return String(value).trim();
        default:
            return value;
    }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const insertWithRetry = async (
    connector: IConnector, tableName: string,
    row: Record<string, any>,
    attempts: number = ROW_RETRY_ATTEMPTS
) => {
    let lastError: any;

    for (let attempt = 0; attempt <= attempts; attempt++) {
        try {
            return await connector.insertRow(tableName, row);
        } catch (err) {
            lastError = err;
            if (attempt < attempts) await sleep(ROW_RETRY_DELAY_MS * (attempt + 1));
        }
    }

    throw lastError;
};

class MigrationService {

    private runs: Map<string, RunState> = new Map();

    getStatus(runId: string) {
        return this.runs.get(runId);
    }

    async start(params: StartParams): Promise<string> {

        const runId = uuid();

        const tables: TableRunState[] = params.project.tables.map((t: any) => ({
            tableMappingId: t.id,
            sourceTable: t.source_table,
            destinationTable: t.destination_table,
            status: "pending",
            totalRows: 0,
            migratedRows: 0,
            failedRows: 0,
            error: null
        }));

        const dbId = await runHistoryService.createRun({
            runId,
            projectId: params.project.id,
            projectName: params.project.project_name,
            sourceDatabase: params.project.source_database,
            destinationDatabase: params.project.destination_database,
            startedBy: params.startedBy,
            tables: tables.map((t) => ({
                tableMappingId: t.tableMappingId,
                sourceTable: t.sourceTable,
                destinationTable: t.destinationTable
            }))
        });

        const runState: RunState = {
            runId,
            dbId,
            projectId: params.project.id,
            status: "running",
            startedAt: new Date().toISOString(),
            finishedAt: null,
            tables
        };

        this.runs.set(runId, runState);

        this.execute(runState, params).catch(async (err) => {
            runState.status = "failed";
            runState.finishedAt = new Date().toISOString();

            for (const table of runState.tables) {
                if (table.status === "pending" || table.status === "running") {
                    table.status = "failed";
                    table.error = err.message || "Migration stopped unexpectedly";
                }
            }
            console.error("Migration run failed unexpectedly:", err);

            try {
                await runHistoryService.finishRun(runState.dbId, "failed");
            } catch (persistErr) {
                console.error("Failed to persist run failure:", persistErr);
            }
        });

        return runId;
    }

    private async execute(runState: RunState, params: StartParams) {

        const { project, sourceConnection, destinationConnection } = params;
        const batchSize = Math.min(MAX_BATCH_SIZE, Math.max(MIN_BATCH_SIZE, params.batchSize || DEFAULT_BATCH_SIZE));

        const { order: orderedTables } = await resolveTableOrder(project.tables, destinationConnection);
        const idMap: Map<string, Map<any, any>> = new Map();
        let anyFailed = false;
        let anyRowErrors = false;

        for (const table of orderedTables) {
            const tableState = runState.tables.find((t) => t.tableMappingId === table.id);
            if (!tableState) {
                console.error(`Migration: no run-state entry for table_mapping ${table.id}, skipping`);
                continue;
            }

            tableState.status = "running";

            try {
                const sourcePkColumn = await sourceConnection.getPrimaryKeyColumn(table.source_table);
                const totalRows = await sourceConnection.countRows(table.source_table);
                tableState.totalRows = totalRows;

                await mappingService.updateTableMappingStatus(
                    table.id, "Running",
                    0, totalRows
                );
                await runHistoryService.updateRunTable(
                    runState.dbId, table.id, "running", 0, totalRows
                );

                const destinationIdMap = new Map<any, any>();
                idMap.set(table.destination_table, destinationIdMap);

                let offset = 0;
                while (true) {

                    const rows = await sourceConnection.readBatch(table.source_table, batchSize, offset);

                    if (rows.length === 0) break;

                    const failedRowBatch: FailedRowInput[] = [];

                    for (const row of rows) {
                        const destRow: Record<string, any> = {};
                        for (const col of table.columns) {

                            let value = row[col.source_column];
                            value = applyTransform(value, col.transform_rule);

                            if (col.lookup_table) {
                                const lookupMap = idMap.get(col.lookup_table);
                                if (lookupMap && lookupMap.has(value)) {
                                    value = lookupMap.get(value);
                                }
                            }
                            destRow[col.destination_column] = value;
                        }

                        try {
                            const insertResult = await insertWithRetry(destinationConnection, table.destination_table, destRow);

                            if (sourcePkColumn && row[sourcePkColumn] !== undefined) {
                                const newId = insertResult.insertId || row[sourcePkColumn];
                                destinationIdMap.set(row[sourcePkColumn], newId);
                            }
                            tableState.migratedRows++;
                        } catch (rowErr: any) {
                            tableState.failedRows++;
                            failedRowBatch.push({
                                tableMappingId: table.id,
                                sourceTable: table.source_table,
                                rowIdentifier: sourcePkColumn && row[sourcePkColumn] !== undefined ? String(row[sourcePkColumn]) : null,
                                errorMessage: rowErr.message || "Unknown error",
                                rowSnapshot: JSON.stringify(destRow)
                            });
                        }
                    }

                    if (failedRowBatch.length > 0) {
                        await runHistoryService.recordFailedRows(runState.dbId, failedRowBatch);
                    }

                    await mappingService.updateTableMappingStatus(
                        table.id,
                        "Running",
                        tableState.migratedRows,
                        totalRows
                    );
                    await runHistoryService.updateRunTable(
                        runState.dbId, table.id, "running", tableState.migratedRows, totalRows, null, tableState.failedRows
                    );

                    offset += batchSize;
                }

                tableState.status = tableState.failedRows > 0 ? "completed_with_errors" : "completed";
                if (tableState.failedRows > 0) anyRowErrors = true;

                const summaryMessage = tableState.failedRows > 0
                    ? `${tableState.failedRows} of ${totalRows} row(s) failed and were skipped - see failed rows report`
                    : null;

                await mappingService.updateTableMappingStatus(
                    table.id,
                    tableState.status === "completed_with_errors" ? "Completed With Errors" : "Completed",
                    tableState.migratedRows,
                    totalRows,
                    summaryMessage
                );
                await runHistoryService.updateRunTable(
                    runState.dbId, table.id, tableState.status, tableState.migratedRows, totalRows, summaryMessage, tableState.failedRows
                );

            } catch (err: any) {
                anyFailed = true;
                tableState.status = "failed";
                tableState.error = err.message;

                await mappingService.updateTableMappingStatus(
                    table.id,
                    "Failed",
                    tableState.migratedRows,
                    tableState.totalRows,
                    err.message
                );
                await runHistoryService.updateRunTable(
                    runState.dbId, table.id, "failed",
                    tableState.migratedRows, tableState.totalRows, err.message, tableState.failedRows
                );
            }
        }
        runState.status = anyFailed ? "failed" : anyRowErrors ? "completed_with_errors" : "completed";
        runState.finishedAt = new Date().toISOString();

        await runHistoryService.finishRun(runState.dbId, runState.status);
    }

}

export default new MigrationService();
