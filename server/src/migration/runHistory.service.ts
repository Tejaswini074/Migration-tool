import { getAppDatabase } from "../config/appDatabase";

interface StartedBy {
    userId: number;
    name: string;
    email: string;
}

interface RunTableInput {
    tableMappingId: number;
    sourceTable: string;
    destinationTable: string;
}

export interface FailedRowInput {
    tableMappingId: number;
    sourceTable: string;
    rowIdentifier: string | null;
    errorMessage: string;
    rowSnapshot: string;
}

class RunHistoryService {

    private async ensureTables() {
        const db = getAppDatabase();

        await db.query(`
            CREATE TABLE IF NOT EXISTS migration_runs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                run_id VARCHAR(64) NOT NULL UNIQUE,
                project_id INT NOT NULL,
                project_name VARCHAR(255) NOT NULL,
                source_database VARCHAR(255) NOT NULL,
                destination_database VARCHAR(255) NOT NULL,
                started_by_user_id INT NOT NULL,
                started_by_name VARCHAR(255) NOT NULL,
                started_by_email VARCHAR(255) NOT NULL,
                status VARCHAR(40) NOT NULL DEFAULT 'running',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                finished_at TIMESTAMP NULL
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS migration_run_tables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_run_id INT NOT NULL,
                table_mapping_id INT NOT NULL,
                source_table VARCHAR(255) NOT NULL,
                destination_table VARCHAR(255) NOT NULL,
                status VARCHAR(40) NOT NULL DEFAULT 'pending',
                total_rows INT DEFAULT 0,
                migrated_rows INT DEFAULT 0,
                failed_rows INT DEFAULT 0,
                error_message TEXT,
                FOREIGN KEY (migration_run_id) REFERENCES migration_runs(id) ON DELETE CASCADE
            )
        `);

        try {
            await db.query(`ALTER TABLE migration_run_tables ADD COLUMN failed_rows INT DEFAULT 0`);
        } catch (err: any) {
            if (err.code !== "ER_DUP_FIELDNAME") throw err;
        }

        // Widen pre-existing status columns for tables created before "completed_with_errors" (21 chars) existed.
        await db.query(`ALTER TABLE migration_runs MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'running'`);
        await db.query(`ALTER TABLE migration_run_tables MODIFY COLUMN status VARCHAR(40) NOT NULL DEFAULT 'pending'`);

        await db.query(`
            CREATE TABLE IF NOT EXISTS migration_failed_rows (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_run_id INT NOT NULL,
                table_mapping_id INT NOT NULL,
                source_table VARCHAR(255) NOT NULL,
                row_identifier VARCHAR(255),
                error_message TEXT NOT NULL,
                row_snapshot TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (migration_run_id) REFERENCES migration_runs(id) ON DELETE CASCADE
            )
        `);
    }

    async createRun(
        params: {
            runId: string;
            projectId: number;
            projectName: string;
            sourceDatabase: string;
            destinationDatabase: string;
            startedBy: StartedBy;
            tables: RunTableInput[];
        }
    ): Promise<number> {

        await this.ensureTables();
        const db = getAppDatabase();

        const [result]: any = await db.execute(
            `INSERT INTO migration_runs
             (run_id, project_id, project_name, source_database, destination_database,
              started_by_user_id, started_by_name, started_by_email, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running')`,
            [
                params.runId,
                params.projectId,
                params.projectName,
                params.sourceDatabase,
                params.destinationDatabase,
                params.startedBy.userId,
                params.startedBy.name,
                params.startedBy.email
            ]
        );

        const migrationRunId = result.insertId;

        for (const table of params.tables) {
            await db.execute(
                `INSERT INTO migration_run_tables
                 (migration_run_id, table_mapping_id, source_table, destination_table, status)
                 VALUES (?, ?, ?, ?, 'pending')`,
                [migrationRunId, table.tableMappingId, table.sourceTable, table.destinationTable]
            );
        }

        return migrationRunId;
    }

    async updateRunTable(
        migrationRunId: number,
        tableMappingId: number,
        status: string,
        migratedRows: number,
        totalRows: number,
        errorMessage: string | null = null,
        failedRows: number = 0
    ) {
        const db = getAppDatabase();

        await db.execute(
            `UPDATE migration_run_tables
             SET status = ?, migrated_rows = ?, total_rows = ?, error_message = ?, failed_rows = ?
             WHERE migration_run_id = ? AND table_mapping_id = ?`,
            [status, migratedRows, totalRows, errorMessage, failedRows, migrationRunId, tableMappingId]
        );
    }

    async recordFailedRows(migrationRunId: number, rows: FailedRowInput[]) {
        if (rows.length === 0) return;
        const db = getAppDatabase();

        const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
        const values = rows.flatMap((r) => [
            migrationRunId,
            r.tableMappingId,
            r.sourceTable,
            r.rowIdentifier,
            r.errorMessage,
            r.rowSnapshot
        ]);

        await db.execute(
            `INSERT INTO migration_failed_rows
             (migration_run_id, table_mapping_id, source_table, row_identifier, error_message, row_snapshot)
             VALUES ${placeholders}`,
            values
        );
    }

    async getFailedRows(migrationRunId: number, tableMappingId?: number) {
        const db = getAppDatabase();

        const [rows]: any = await db.query(
            tableMappingId
                ? `SELECT * FROM migration_failed_rows WHERE migration_run_id = ? AND table_mapping_id = ? ORDER BY id ASC LIMIT 500`
                : `SELECT * FROM migration_failed_rows WHERE migration_run_id = ? ORDER BY id ASC LIMIT 500`,
            tableMappingId ? [migrationRunId, tableMappingId] : [migrationRunId]
        );

        return rows;
    }

    async finishRun(migrationRunId: number, status: "completed" | "completed_with_errors" | "failed") {
        const db = getAppDatabase();

        await db.execute(
            `UPDATE migration_runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [status, migrationRunId]
        );
    }

    async listRuns(requester: { userId: number; role: string }) {

        await this.ensureTables();
        const db = getAppDatabase();
        const isAdmin = requester.role === "admin";

        const [rows]: any = await db.query(
            isAdmin
                ? `SELECT * FROM migration_runs ORDER BY started_at DESC`
                : `SELECT * FROM migration_runs WHERE started_by_user_id = ? ORDER BY started_at DESC`,
            isAdmin ? [] : [requester.userId]
        );

        return rows;
    }

    async getRun(runId: string) {

        await this.ensureTables();
        const db = getAppDatabase();

        const [runs]: any = await db.query(
            `SELECT * FROM migration_runs WHERE run_id = ?`,
            [runId]
        );

        if (!runs[0]) return null;
        const [tables]: any = await db.query(
            `SELECT * FROM migration_run_tables WHERE migration_run_id = ? ORDER BY id ASC`,
            [runs[0].id]
        );

        return { ...runs[0], tables };
    }

}

export default new RunHistoryService();
