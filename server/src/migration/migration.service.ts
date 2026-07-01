import mysql from "mysql2/promise";
import { v4 as uuid } from "uuid";
import schemaService from "../schema/schema.service";
import mappingService from "../Mapping/mapping.service";
import runHistoryService from "./runHistory.service";

const BATCH_SIZE = 500;

type Status = "pending" | "running" | "completed" | "failed" | "skipped";

interface TableRunState {
    tableMappingId: number;
    sourceTable: string;
    destinationTable: string;
    status: Status;
    totalRows: number;
    migratedRows: number;
    error: string | null;
}

interface RunState {
    runId: string;
    dbId: number;
    projectId: number;
    status: "running" | "completed" | "failed";
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
    sourceConnection: mysql.Pool;
    destinationConnection: mysql.Pool;
    metadataConnection: mysql.Pool;
    startedBy: StartedBy;
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

const getPrimaryKeyColumn = async (connection: mysql.Pool, tableName: string): Promise<string | null> => {

    const [rows]: any = await connection.query(
        `SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`
    );

    if (rows.length !== 1) return null;
    return rows[0].Column_name;
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
            error: null
        }));

        const dbId = await runHistoryService.createRun(params.metadataConnection, {
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
                await runHistoryService.finishRun(params.metadataConnection, runState.dbId, "failed");
            } catch (persistErr) {
                console.error("Failed to persist run failure:", persistErr);
            }
        });

        return runId;
    }

    private async orderTables(project: any, destinationConnection: mysql.Pool) {

        const tables = project.tables;
        const destNames = new Set(tables.map((t: any) => t.destination_table));
        const inDegree = new Map<string, number>();
        const graph = new Map<string, string[]>();

        tables.forEach((t: any) => {
            inDegree.set(t.destination_table, 0);
            graph.set(t.destination_table, []);
        });

        for (const t of tables) {
            const foreignKeys = await schemaService.getForeignKeys(destinationConnection, t.destination_table);

            for (const fk of foreignKeys) {
                const parent = fk.REFERENCED_TABLE_NAME;
                if (destNames.has(parent) && parent !== t.destination_table) {
                    graph.get(parent)!.push(t.destination_table);
                    inDegree.set(t.destination_table, (inDegree.get(t.destination_table) || 0) + 1);
                }
            }
        }

        const queue: string[] = [];
        inDegree.forEach((degree, name) => {
            if (degree === 0) queue.push(name);
        });

        const order: string[] = [];
        while (queue.length) {
            const name = queue.shift()!;
            order.push(name);
            (graph.get(name) || []).forEach((child) => {
                inDegree.set(child, inDegree.get(child)! - 1);
                if (inDegree.get(child) === 0) queue.push(child);
            });
        }

        if (order.length !== tables.length) {
            return tables;
        }

        const byName = new Map(tables.map((t: any) => [t.destination_table, t]));
        return order.map((name) => byName.get(name));
    }

    private async execute(runState: RunState, params: StartParams) {

        const { project, sourceConnection, destinationConnection, metadataConnection } = params;

        const orderedTables = await this.orderTables(project, destinationConnection);
        const idMap: Map<string, Map<any, any>> = new Map();
        let anyFailed = false;

        for (const table of orderedTables) {
            const tableState = runState.tables.find((t) => t.tableMappingId === table.id);
            if (!tableState) {
                console.error(`Migration: no run-state entry for table_mapping ${table.id}, skipping`);
                continue;
            }

            tableState.status = "running";

            try {
                const sourcePkColumn = await getPrimaryKeyColumn(sourceConnection, table.source_table);
                const [countRows]: any = await sourceConnection.query(
                    `SELECT COUNT(*) total FROM \`${table.source_table}\``
                );
                const totalRows = countRows[0].total;
                tableState.totalRows = totalRows;

                await mappingService.updateTableMappingStatus(
                    metadataConnection, table.id, "Running",
                    0, totalRows
                );
                await runHistoryService.updateRunTable(
                    metadataConnection, runState.dbId, table.id, "running", 0, totalRows
                );

                const destinationIdMap = new Map<any, any>();
                idMap.set(table.destination_table, destinationIdMap);

                let offset = 0;
                while (true) {

                    const [rows]: any = await sourceConnection.query(
                        `SELECT * FROM \`${table.source_table}\` LIMIT ? OFFSET ?`,
                        [BATCH_SIZE, offset]
                    );

                    if (rows.length === 0) break;

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

                        const columnNames = Object.keys(destRow);
                        const placeholders = columnNames.map(() => "?").join(", ");
                        const escapedColumns = columnNames.map((c) => `\`${c}\``).join(", ");

                        const [insertResult]: any = await destinationConnection.execute(
                            `INSERT INTO \`${table.destination_table}\` (${escapedColumns}) VALUES (${placeholders})`,
                            columnNames.map((c) => destRow[c])
                        );

                        if (sourcePkColumn && row[sourcePkColumn] !== undefined) {
                            const newId = insertResult.insertId || row[sourcePkColumn];
                            destinationIdMap.set(row[sourcePkColumn], newId);
                        }
                        tableState.migratedRows++;
                    }

                    await mappingService.updateTableMappingStatus(
                        metadataConnection,
                        table.id,
                        "Running",
                        tableState.migratedRows,
                        totalRows
                    );
                    await runHistoryService.updateRunTable(
                        metadataConnection, runState.dbId, table.id, "running", tableState.migratedRows, totalRows
                    );

                    offset += BATCH_SIZE;
                }

                tableState.status = "completed";
                await mappingService.updateTableMappingStatus(
                    metadataConnection,
                    table.id,
                    "Completed",
                    tableState.migratedRows,
                    totalRows,
                    null
                );
                await runHistoryService.updateRunTable(
                    metadataConnection, runState.dbId, table.id, "completed", tableState.migratedRows, totalRows
                );

            } catch (err: any) {
                anyFailed = true;
                tableState.status = "failed";
                tableState.error = err.message;

                await mappingService.updateTableMappingStatus(
                    metadataConnection,
                    table.id,
                    "Failed",
                    tableState.migratedRows,
                    tableState.totalRows,
                    err.message
                );
                await runHistoryService.updateRunTable(
                    metadataConnection, runState.dbId, table.id, "failed",
                    tableState.migratedRows, tableState.totalRows, err.message
                );
            }
        }
        runState.status = anyFailed ? "failed" : "completed";
        runState.finishedAt = new Date().toISOString();

        await runHistoryService.finishRun(metadataConnection, runState.dbId, runState.status);
    }

}

export default new MigrationService();
