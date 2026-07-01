import mysql from "mysql2/promise";

class MappingService {

    private async ensureTables(connection: mysql.Pool) {

        await connection.query(`
            CREATE TABLE IF NOT EXISTS migration_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_name VARCHAR(255) NOT NULL,
                source_database VARCHAR(255) NOT NULL,
                destination_database VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS table_mapping (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                source_table VARCHAR(255) NOT NULL,
                destination_table VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                migrated_rows INT DEFAULT 0,
                total_rows INT DEFAULT 0,
                error_message TEXT,
                FOREIGN KEY (project_id) REFERENCES migration_projects(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS column_mapping (
                id INT AUTO_INCREMENT PRIMARY KEY,
                table_mapping_id INT NOT NULL,
                source_column VARCHAR(255) NOT NULL,
                destination_column VARCHAR(255) NOT NULL,
                transform_rule VARCHAR(50) DEFAULT NULL,
                lookup_table VARCHAR(255) DEFAULT NULL,
                lookup_column VARCHAR(255) DEFAULT NULL,
                FOREIGN KEY (table_mapping_id) REFERENCES table_mapping(id) ON DELETE CASCADE
            )
        `);
    }

    async createProject(connection: mysql.Pool, data: any) {

        await this.ensureTables(connection);

        const sql = `
        INSERT INTO migration_projects
        (
            project_name,
            source_database,
            destination_database
        )
        VALUES (?,?,?)
        `;

        const [result]: any = await connection.execute(sql, [
            data.projectName,
            data.sourceDatabase,
            data.destinationDatabase
        ]);

        return result.insertId;
    }

    async getProjects(connection: mysql.Pool) {
        await this.ensureTables(connection);
        const [rows]: any = await connection.query(
            "SELECT * FROM migration_projects ORDER BY created_at DESC"
        );

        return rows;
    }

    async getProjectDetail(connection: mysql.Pool, projectId: number) {
        await this.ensureTables(connection);

        const [projects]: any = await connection.query(
            "SELECT * FROM migration_projects WHERE id = ?",
            [projectId]
        );

        if (!projects[0]) return null;

        const [tables]: any = await connection.query(
            "SELECT * FROM table_mapping WHERE project_id = ?",
            [projectId]
        );

        for (const table of tables) {
            const [columns]: any = await connection.query(
                "SELECT * FROM column_mapping WHERE table_mapping_id = ?",
                [table.id]
            );
            table.columns = columns;
        }
        return { ...projects[0], tables };
    }

    async saveTableMapping(connection: mysql.Pool, data: any) {

        await this.ensureTables(connection);

        const sql = `
        INSERT INTO table_mapping
        (
            project_id,
            source_table,
            destination_table,
            status
        )
        VALUES (?,?,?,?)
        `;

        const [result]: any = await connection.execute(sql, [
            data.projectId,
            data.sourceTable,
            data.destinationTable,
            "Pending"
        ]);

        return result.insertId;
    }

    async saveColumnMapping(connection: mysql.Pool, data: any) {

        await this.ensureTables(connection);

        const sql = `
        INSERT INTO column_mapping
        (
            table_mapping_id,
            source_column,
            destination_column,
            transform_rule,
            lookup_table,
            lookup_column
        )
        VALUES (?,?,?,?,?,?)
        `;

        const [result]: any = await connection.execute(sql, [
            data.tableMappingId,
            data.sourceColumn,
            data.destinationColumn,
            data.transformRule || null,
            data.lookupTable || null,
            data.lookupColumn || null
        ]);

        return result.insertId;
    }

    async updateTableMappingStatus(
        connection: mysql.Pool,
        tableMappingId: number,
        status: string,
        migratedRows?: number,
        totalRows?: number,
        errorMessage?: string | null
    ) {

        await connection.execute(
            `UPDATE table_mapping
             SET status = ?,
                 migrated_rows = COALESCE(?, migrated_rows),
                 total_rows = COALESCE(?, total_rows),
                 error_message = ?
             WHERE id = ?`,
            [
                status,
                migratedRows ?? null,
                totalRows ?? null,
                errorMessage ?? null,
                tableMappingId
            ]
        );
    }

}

export default new MappingService();
