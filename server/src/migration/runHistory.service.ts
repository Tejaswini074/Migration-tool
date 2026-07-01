import mysql from "mysql2/promise";

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

class RunHistoryService {

    private async ensureTables(connection: mysql.Pool) {

        await connection.query(`
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
                status VARCHAR(20) NOT NULL DEFAULT 'running',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                finished_at TIMESTAMP NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS migration_run_tables (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_run_id INT NOT NULL,
                table_mapping_id INT NOT NULL,
                source_table VARCHAR(255) NOT NULL,
                destination_table VARCHAR(255) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                total_rows INT DEFAULT 0,
                migrated_rows INT DEFAULT 0,
                error_message TEXT,
                FOREIGN KEY (migration_run_id) REFERENCES migration_runs(id) ON DELETE CASCADE
            )
        `);
    }

    async createRun(
        connection: mysql.Pool,
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

        await this.ensureTables(connection);

        const [result]: any = await connection.execute(
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
            await connection.execute(
                `INSERT INTO migration_run_tables
                 (migration_run_id, table_mapping_id, source_table, destination_table, status)
                 VALUES (?, ?, ?, ?, 'pending')`,
                [migrationRunId, table.tableMappingId, table.sourceTable, table.destinationTable]
            );
        }

        return migrationRunId;
    }

    async updateRunTable(
        connection: mysql.Pool,
        migrationRunId: number,
        tableMappingId: number,
        status: string,
        migratedRows: number,
        totalRows: number,
        errorMessage: string | null = null
    ) {
        await connection.execute(
            `UPDATE migration_run_tables
             SET status = ?, migrated_rows = ?, total_rows = ?, error_message = ?
             WHERE migration_run_id = ? AND table_mapping_id = ?`,
            [status, migratedRows, totalRows, errorMessage, migrationRunId, tableMappingId]
        );
    }

    async finishRun(connection: mysql.Pool, migrationRunId: number, status: "completed" | "failed") {
        await connection.execute(
            `UPDATE migration_runs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [status, migrationRunId]
        );
    }

    async listRuns(connection: mysql.Pool, requester: { userId: number; role: string }) {

        await this.ensureTables(connection);
        const isAdmin = requester.role === "admin";

        const [rows]: any = await connection.query(
            isAdmin
                ? `SELECT * FROM migration_runs ORDER BY started_at DESC`
                : `SELECT * FROM migration_runs WHERE started_by_user_id = ? ORDER BY started_at DESC`,
            isAdmin ? [] : [requester.userId]
        );

        return rows;
    }

    async getRun(connection: mysql.Pool, runId: string) {

        await this.ensureTables(connection);

        const [runs]: any = await connection.query(
            `SELECT * FROM migration_runs WHERE run_id = ?`,
            [runId]
        );

        if (!runs[0]) return null;
        const [tables]: any = await connection.query(
            `SELECT * FROM migration_run_tables WHERE migration_run_id = ? ORDER BY id ASC`,
            [runs[0].id]
        );

        return { ...runs[0], tables };
    }

}

export default new RunHistoryService();
