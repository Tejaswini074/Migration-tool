import { getAppDatabase } from "../config/appDatabase";
import { applyTransform } from "../migration/transform";
import { IConnector } from "../connectors/types";

interface CreatedBy {
    userId: number;
    name: string;
    email: string;
}

interface Requester {
    userId: number;
    role: string;
}

export const canAccessProject = (project: any, requester: Requester) =>
    requester.role === "admin" || project.created_by_user_id === requester.userId;

export type ProjectAccessResult =
    | { ok: true; project: any }
    | { ok: false; status: 404 | 403; message: string };

export type TableMappingAccessResult =
    | { ok: true; tableMapping: any }
    | { ok: false; status: 404 | 403; message: string };

class MappingService {

    private async ensureTables() {
        const db = getAppDatabase();

        await db.query(`
            CREATE TABLE IF NOT EXISTS migration_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_name VARCHAR(255) NOT NULL,
                source_database VARCHAR(255) NOT NULL,
                destination_database VARCHAR(255) NOT NULL,
                created_by_user_id INT NOT NULL,
                created_by_name VARCHAR(255) NOT NULL,
                created_by_email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // MySQL has no ADD COLUMN IF NOT EXISTS (that's MariaDB-only) - ignore only the "already exists" error.
        const addColumnIfMissing = async (sql: string) => {
            try {
                await db.query(sql);
            } catch (err: any) {
                if (err.code !== "ER_DUP_FIELDNAME") throw err;
            }
        };
        await addColumnIfMissing(`ALTER TABLE migration_projects ADD COLUMN created_by_user_id INT NOT NULL DEFAULT 0`);
        await addColumnIfMissing(`ALTER TABLE migration_projects ADD COLUMN created_by_name VARCHAR(255) NOT NULL DEFAULT ''`);
        await addColumnIfMissing(`ALTER TABLE migration_projects ADD COLUMN created_by_email VARCHAR(255) NOT NULL DEFAULT ''`);

        await db.query(`
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
        await addColumnIfMissing(`ALTER TABLE table_mapping ADD COLUMN high_water_column VARCHAR(255) DEFAULT NULL`);
        await addColumnIfMissing(`ALTER TABLE table_mapping ADD COLUMN high_water_value VARCHAR(255) DEFAULT NULL`);

        await db.query(`
            CREATE TABLE IF NOT EXISTS column_mapping (
                id INT AUTO_INCREMENT PRIMARY KEY,
                table_mapping_id INT NOT NULL,
                source_column VARCHAR(255) NOT NULL,
                destination_column VARCHAR(255) NOT NULL,
                transform_rule VARCHAR(500) DEFAULT NULL,
                lookup_table VARCHAR(255) DEFAULT NULL,
                lookup_column VARCHAR(255) DEFAULT NULL,
                FOREIGN KEY (table_mapping_id) REFERENCES table_mapping(id) ON DELETE CASCADE
            )
        `);
        // transform_rule now stores a small JSON blob (e.g. regex_replace) instead of a bare keyword.
        await db.query(`ALTER TABLE column_mapping MODIFY COLUMN transform_rule VARCHAR(500) DEFAULT NULL`);
    }

    async createProject(
        data: { projectName: string; sourceDatabase: string; destinationDatabase: string },
        createdBy: CreatedBy
    ) {
        await this.ensureTables();
        const db = getAppDatabase();

        const [result]: any = await db.execute(
            `INSERT INTO migration_projects
             (project_name, source_database, destination_database, created_by_user_id, created_by_name, created_by_email)
             VALUES (?,?,?,?,?,?)`,
            [data.projectName, data.sourceDatabase, data.destinationDatabase, createdBy.userId, createdBy.name, createdBy.email]
        );

        return result.insertId;
    }

    async getProjects(requester: Requester) {
        await this.ensureTables();
        const db = getAppDatabase();
        const isAdmin = requester.role === "admin";

        const [rows]: any = await db.query(
            isAdmin
                ? "SELECT * FROM migration_projects ORDER BY created_at DESC"
                : "SELECT * FROM migration_projects WHERE created_by_user_id = ? ORDER BY created_at DESC",
            isAdmin ? [] : [requester.userId]
        );
        return rows;
    }

    async getProjectDetail(projectId: number) {
        await this.ensureTables();
        const db = getAppDatabase();

        const [projects]: any = await db.query(
            "SELECT * FROM migration_projects WHERE id = ?",
            [projectId]
        );

        if (!projects[0]) return null;

        const [tables]: any = await db.query(
            "SELECT * FROM table_mapping WHERE project_id = ?",
            [projectId]
        );

        for (const table of tables) {
            const [columns]: any = await db.query(
                "SELECT * FROM column_mapping WHERE table_mapping_id = ?",
                [table.id]
            );
            table.columns = columns;
        }
        return { ...projects[0], tables };
    }

    /**
     * Fetches a project and checks the requester can see it in one call, so
     * every controller that needs "load this project, but only if it's mine"
     * doesn't have to hand-roll the same not-found/forbidden dance.
     */
    async getAccessibleProject(projectId: number, requester: Requester): Promise<ProjectAccessResult> {
        const project = await this.getProjectDetail(projectId);

        if (!project) {
            return { ok: false, status: 404, message: "Project Not Found" };
        }
        if (!canAccessProject(project, requester)) {
            return { ok: false, status: 403, message: "You cannot access another user's project" };
        }
        return { ok: true, project };
    }

    /**
     * Same load-then-authorize convenience as getAccessibleProject, but for endpoints that
     * only receive a tableMappingId (saveColumnMapping, setHighWaterColumn) - resolves the
     * owning project via a join so those endpoints can't be used to write into someone else's
     * table mapping just by guessing a sequential id.
     */
    async getAccessibleTableMapping(tableMappingId: number, requester: Requester): Promise<TableMappingAccessResult> {
        await this.ensureTables();
        const db = getAppDatabase();

        const [rows]: any = await db.query(
            `SELECT tm.*, mp.created_by_user_id
             FROM table_mapping tm
             JOIN migration_projects mp ON mp.id = tm.project_id
             WHERE tm.id = ?`,
            [tableMappingId]
        );
        const tableMapping = rows[0];

        if (!tableMapping) {
            return { ok: false, status: 404, message: "Table mapping not found" };
        }
        if (requester.role !== "admin" && tableMapping.created_by_user_id !== requester.userId) {
            return { ok: false, status: 403, message: "You cannot modify another user's table mapping" };
        }
        return { ok: true, tableMapping };
    }

    async saveTableMapping(data: { projectId: number; sourceTable: string; destinationTable: string }) {

        await this.ensureTables();
        const db = getAppDatabase();

        const sql = ` INSERT INTO table_mapping
        (project_id,source_table, destination_table,status)
        VALUES (?,?,?,?)
        `;

        const [result]: any = await db.execute(sql, [
            data.projectId,
            data.sourceTable,
            data.destinationTable,
            "Pending"
        ]);

        return result.insertId;
    }

    async saveColumnMapping(data: {
        tableMappingId: number; sourceColumn: string;
        destinationColumn: string; transformRule?: string | null;
        lookupTable?: string | null; lookupColumn?: string | null;
    }) {

        await this.ensureTables();
        const db = getAppDatabase();

        const sql = `INSERT INTO column_mapping
        (
            table_mapping_id,source_column,
            destination_column,transform_rule,
            lookup_table, lookup_column  
        )
        VALUES (?,?,?,?,?,?)
        `;

        const [result]: any = await db.execute(sql, [
            data.tableMappingId,
            data.sourceColumn,
            data.destinationColumn,
            data.transformRule || null,
            data.lookupTable || null,
            data.lookupColumn || null
        ]);

        return result.insertId;
    }

    /** Reads a small sample of source rows and shows what each column's transform would produce. */
    async previewMapping(
        sourceConnection: IConnector,
        tableName: string,
        columns: { sourceColumn: string; destinationColumn: string; transformRule?: string | null }[]
    ) {
        const sampleRows = await sourceConnection.readBatch(tableName, 5, 0);

        return sampleRows.map((row) => {
            const preview: Record<string, { source: any; transformed: any }> = {};
            for (const col of columns) {
                const sourceValue = row[col.sourceColumn];
                preview[col.destinationColumn] = {
                    source: sourceValue,
                    transformed: applyTransform(sourceValue, col.transformRule)
                };
            }
            return preview;
        });
    }

    async setHighWaterColumn(tableMappingId: number, column: string | null) {
        await this.ensureTables();
        const db = getAppDatabase();
        await db.execute(
            `UPDATE table_mapping SET high_water_column = ? WHERE id = ?`,
            [column || null, tableMappingId]
        );
    }

    async updateTableHighWaterValue(tableMappingId: number, value: string | number) {
        const db = getAppDatabase();
        await db.execute(
            `UPDATE table_mapping SET high_water_value = ? WHERE id = ?`,
            [String(value), tableMappingId]
        );
    }

    async updateTableMappingStatus(
        tableMappingId: number, status: string, migratedRows?: number,
        totalRows?: number, errorMessage?: string | null
    ) {
        const db = getAppDatabase();

        await db.execute(
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
