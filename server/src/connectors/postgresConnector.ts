import { Pool } from "pg";
import { ColumnInfo, ConnectionConfig, ForeignKeyInfo, IConnector, InsertResult, TableInfo, TableSchema } from "./types";

export class PostgresConnector implements IConnector {

    readonly type = "postgres" as const;
    private pool: Pool;

    constructor(config: ConnectionConfig) {
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            max: 10
        });
    }

    getNativeHandle(): Pool {
        return this.pool;
    }

    async testConnection(): Promise<void> {
        await this.pool.query("SELECT 1");
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    async getTables(): Promise<TableInfo[]> {
        const { rows } = await this.pool.query(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
             ORDER BY table_name`
        );
        const result: TableInfo[] = [];
        for (const row of rows) {
            result.push({
                tableName: row.table_name,
                totalRows: await this.countRows(row.table_name)
            });
        }
        return result;
    }

    async getColumns(tableName: string): Promise<ColumnInfo[]> {
        const { rows } = await this.pool.query(
            `SELECT
                c.column_name AS "Field",
                CASE WHEN c.character_maximum_length IS NOT NULL
                    THEN c.data_type || '(' || c.character_maximum_length || ')'
                    ELSE c.data_type
                END AS "Type",
                c.is_nullable AS "Null",
                COALESCE(k.constraint_type, '') AS "Key",
                c.column_default AS "Default",
                CASE WHEN c.column_default LIKE 'nextval(%' THEN 'auto_increment' ELSE '' END AS "Extra"
             FROM information_schema.columns c
             LEFT JOIN (
                SELECT kcu.column_name, tc.constraint_type
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.table_constraints tc
                    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                WHERE kcu.table_schema = 'public' AND kcu.table_name = $1
                    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
             ) k ON k.column_name = c.column_name
             WHERE c.table_schema = 'public' AND c.table_name = $1
             ORDER BY c.ordinal_position`,
            [tableName]
        );

        return rows.map((row) => ({
            Field: row.Field,
            Type: row.Type,
            Null: row.Null === "YES" ? "YES" : "NO",
            Key: row.Key === "PRIMARY KEY" ? "PRI" : row.Key === "UNIQUE" ? "UNI" : "",
            Default: row.Default,
            Extra: row.Extra
        }));
    }

    async getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
        const { rows } = await this.pool.query(
            `SELECT
                kcu.column_name AS "COLUMN_NAME",
                ccu.table_name AS "REFERENCED_TABLE_NAME",
                ccu.column_name AS "REFERENCED_COLUMN_NAME"
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
             JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
             WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = $1`,
            [tableName]
        );
        return rows;
    }

    async getSchema(): Promise<TableSchema[]> {
        const tables = await this.getTables();
        const schema: TableSchema[] = [];

        for (const table of tables) {
            const columns = await this.getColumns(table.tableName);
            const foreignKeys = await this.getForeignKeys(table.tableName);

            schema.push({
                tableName: table.tableName,
                totalRows: table.totalRows,
                columns,
                foreignKeys
            });
        }
        return schema;
    }

    async getPrimaryKeyColumn(tableName: string): Promise<string | null> {
        const { rows } = await this.pool.query(
            `SELECT kcu.column_name
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
             WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND tc.table_name = $1`,
            [tableName]
        );
        if (rows.length !== 1) return null;
        return rows[0].column_name;
    }

    async countRows(tableName: string): Promise<number> {
        const { rows } = await this.pool.query(`SELECT COUNT(*) total FROM "${tableName}"`);
        return Number(rows[0].total);
    }

    async readBatch(tableName: string, limit: number, offset: number): Promise<Record<string, any>[]> {
        const { rows } = await this.pool.query(
            `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return rows;
    }

    async readBatchSince(
        tableName: string, column: string, sinceValue: any, limit: number, offset: number
    ): Promise<Record<string, any>[]> {
        const { rows } = await this.pool.query(
            `SELECT * FROM "${tableName}" WHERE "${column}" > $1 ORDER BY "${column}" LIMIT $2 OFFSET $3`,
            [sinceValue, limit, offset]
        );
        return rows;
    }

    async insertRow(tableName: string, row: Record<string, any>): Promise<InsertResult> {
        const columnNames = Object.keys(row);

        if (columnNames.length === 0) {
            throw new Error("No columns are mapped for this table - nothing to insert");
        }

        const quotedColumns = columnNames.map((c) => `"${c}"`).join(", ");
        const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(", ");
        const primaryKeyColumn = await this.getPrimaryKeyColumn(tableName);
        const returning = primaryKeyColumn ? ` RETURNING "${primaryKeyColumn}"` : "";

        const { rows } = await this.pool.query(
            `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})${returning}`,
            columnNames.map((c) => row[c])
        );

        return { insertId: primaryKeyColumn ? rows[0]?.[primaryKeyColumn] : undefined };
    }

    async countNulls(tableName: string, columnName: string): Promise<number> {
        const { rows } = await this.pool.query(
            `SELECT COUNT(*) total FROM "${tableName}" WHERE "${columnName}" IS NULL`
        );
        return Number(rows[0].total);
    }

    async countDuplicateValues(tableName: string, columnName: string): Promise<number> {
        const { rows } = await this.pool.query(
            `SELECT COUNT(*) total FROM (
                SELECT "${columnName}" FROM "${tableName}"
                WHERE "${columnName}" IS NOT NULL
                GROUP BY "${columnName}"
                HAVING COUNT(*) > 1
             ) dupes`
        );
        return Number(rows[0].total);
    }
}
