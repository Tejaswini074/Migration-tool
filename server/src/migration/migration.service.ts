import { v4 as uuid } from "uuid";
import mappingService from "../Mapping/mapping.service";
import runHistoryService, { FailedRowInput } from "./runHistory.service";
import notificationService from "../notifications/notification.service";
import { resolveTableOrder } from "./dependencyOrder";
import { applyTransform } from "./transform";
import { IConnector } from "../connectors/types";

const DEFAULT_BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 5000;
const ROW_RETRY_ATTEMPTS = 2;
const ROW_RETRY_DELAY_MS = 150;

type Status = "pending" | "running" | "completed" | "completed_with_errors" | "failed" | "skipped" | "cancelled";

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
    status: "running" | "completed" | "completed_with_errors" | "failed" | "cancelled";
    startedAt: string;
    finishedAt: string | null;
    tables: TableRunState[];
    cancelRequested: boolean;
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
    mode?: "full" | "incremental";
    /** "upsert" updates the existing row (matched on the destination's mapped primary key)
     *  instead of erroring on a unique-constraint violation - see resolveConflictColumns. */
    insertMode?: "insert" | "upsert";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const insertWithRetry = async (
    connector: IConnector, tableName: string,
    row: Record<string, any>,
    conflictColumns: string[] | null,
    attempts: number = ROW_RETRY_ATTEMPTS
) => {
    let lastError: any;

    for (let attempt = 0; attempt <= attempts; attempt++) {
        try {
            return conflictColumns && connector.upsertRow
                ? await connector.upsertRow(tableName, row, conflictColumns)
                : await connector.insertRow(tableName, row);
        } catch (err) {
            lastError = err;
            if (attempt < attempts) await sleep(ROW_RETRY_DELAY_MS * (attempt + 1));
        }
    }

    throw lastError;
};

/**
 * Upsert needs a column that uniquely identifies "the same logical row" across runs - the
 * destination's primary key is the only thing we can infer that for automatically, and only
 * if it's actually mapped (otherwise there's no source value to match against). Falls back to
 * a plain insert for tables where that doesn't hold, rather than failing the whole run.
 */
const resolveConflictColumns = async (
    destinationConnection: IConnector, table: any, insertMode?: "insert" | "upsert"
): Promise<string[] | null> => {
    if (insertMode !== "upsert") return null;

    const destPkColumn = await destinationConnection.getPrimaryKeyColumn(table.destination_table);
    if (!destPkColumn) return null;

    const mappedDestCols = new Set(table.columns.map((c: any) => c.destination_column));
    if (!mappedDestCols.has(destPkColumn)) return null;

    return [destPkColumn];
};

class MigrationService {

    private runs: Map<string, RunState> = new Map();

    getStatus(runId: string) {
        return this.runs.get(runId);
    }

    /** Flags a running migration to stop at the next safe checkpoint (between batches/tables). */
    cancel(runId: string): boolean {
        const runState = this.runs.get(runId);
        if (!runState || runState.status !== "running") return false;
        runState.cancelRequested = true;
        return true;
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
            tables,
            cancelRequested: false
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

            this.notifyRunFinished(runState, params.startedBy.userId, params.project.project_name);
        });

        return runId;
    }

    private notifyRunFinished(runState: RunState, startedByUserId: number, projectName: string) {
        const totals = runState.tables.reduce(
            (acc, t) => ({
                totalRows: acc.totalRows + t.totalRows,
                migratedRows: acc.migratedRows + t.migratedRows,
                failedRows: acc.failedRows + t.failedRows
            }),
            { totalRows: 0, migratedRows: 0, failedRows: 0 }
        );

        notificationService.notifyRunFinished({
            runId: runState.runId,
            projectName,
            // Only ever called after runState.status has moved off "running" to a terminal value.
            status: runState.status as "completed" | "completed_with_errors" | "failed" | "cancelled",
            startedByUserId,
            ...totals
        });
    }

    private async execute(runState: RunState, params: StartParams) {

        const { project, sourceConnection, destinationConnection } = params;
        const batchSize = Math.min(MAX_BATCH_SIZE, Math.max(MIN_BATCH_SIZE, params.batchSize || DEFAULT_BATCH_SIZE));

        const { order: orderedTables } = await resolveTableOrder(project.tables, destinationConnection);
        const idMap: Map<string, Map<any, any>> = new Map();
        let anyFailed = false;
        let anyRowErrors = false;
        let wasCancelled = false;

        for (const table of orderedTables) {
            if (runState.cancelRequested) {
                wasCancelled = true;
                break;
            }

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

                const conflictColumns = await resolveConflictColumns(destinationConnection, table, params.insertMode);

                const incrementalMode = params.mode === "incremental"
                    && Boolean(table.high_water_column)
                    && Boolean(sourceConnection.readBatchSince);
                let cursor: any = table.high_water_value ?? null;

                let offset = 0;
                while (true) {

                    const rows = incrementalMode
                        ? await sourceConnection.readBatchSince!(table.source_table, table.high_water_column, cursor, batchSize, 0)
                        : await sourceConnection.readBatch(table.source_table, batchSize, offset);

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
                            const insertResult = await insertWithRetry(
                                destinationConnection, table.destination_table, destRow, conflictColumns
                            );

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

                    if (incrementalMode) {
                        cursor = rows[rows.length - 1][table.high_water_column];
                    }
                    offset += batchSize;

                    if (runState.cancelRequested) break;
                }

                if (incrementalMode && cursor !== null && cursor !== undefined) {
                    await mappingService.updateTableHighWaterValue(table.id, cursor);
                }

                if (runState.cancelRequested) {
                    wasCancelled = true;
                    tableState.status = "cancelled";

                    await mappingService.updateTableMappingStatus(
                        table.id, "Cancelled", tableState.migratedRows, totalRows, "Migration was cancelled"
                    );
                    await runHistoryService.updateRunTable(
                        runState.dbId, table.id, "cancelled", tableState.migratedRows, totalRows, "Migration was cancelled", tableState.failedRows
                    );
                    break;
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
        if (wasCancelled) {
            for (const tableState of runState.tables) {
                if (tableState.status === "pending") tableState.status = "cancelled";
            }
            runState.status = "cancelled";
        } else {
            runState.status = anyFailed ? "failed" : anyRowErrors ? "completed_with_errors" : "completed";
        }
        runState.finishedAt = new Date().toISOString();

        await runHistoryService.finishRun(runState.dbId, runState.status);

        this.notifyRunFinished(runState, params.startedBy.userId, params.project.project_name);
    }

}

export default new MigrationService();
