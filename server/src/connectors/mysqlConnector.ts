import mysql from "mysql2/promise";
import { ColumnInfo, ConnectionConfig, ForeignKeyInfo, IConnector, InsertResult, TableInfo, TableSchema } from "./types";

export class MySqlConnector implements IConnector {

    readonly type = "mysql" as const;
    private pool: mysql.Pool;

    constructor(config: ConnectionConfig) {
        this.pool = mysql.createPool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            waitForConnections: true,
            connectionLimit: 10
        });
    }

    getNativeHandle(): mysql.Pool {
        return this.pool;
    }

    async testConnection(): Promise<void> {
        await this.pool.query("SELECT 1");
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    async getTables(): Promise<TableInfo[]> {
        const [tables]: any = await this.pool.query("SHOW TABLES");
        const result: TableInfo[] = [];

        for (const table of tables) {
            const tableName = String(Object.values(table)[0]);
            result.push({
                tableName,
                totalRows: await this.countRows(tableName)
            });
        }
        return result;
    }

    async getColumns(tableName: string): Promise<ColumnInfo[]> {
        const [columns]: any = await this.pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
        return columns;
    }

    async getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
        const [db]: any = await this.pool.query("SELECT DATABASE() db");
        const database = db[0].db;

        const [foreignKeys]: any = await this.pool.query(
            `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
             FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL`,
            [database, tableName]
        );
        return foreignKeys;
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
        const [rows]: any = await this.pool.query(
            `SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`
        );
        if (rows.length !== 1) return null;
        return rows[0].Column_name;
    }

    async countRows(tableName: string): Promise<number> {
        const [rows]: any = await this.pool.query(`SELECT COUNT(*) total FROM \`${tableName}\``);
        return rows[0].total;
    }

    async readBatch(tableName: string, limit: number, offset: number): Promise<Record<string, any>[]> {
        const [rows]: any = await this.pool.query(
            `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    }

    async insertRow(tableName: string, row: Record<string, any>): Promise<InsertResult> {
        const columnNames = Object.keys(row);
        const placeholders = columnNames.map(() => "?").join(", ");
        const escapedColumns = columnNames.map((c) => `\`${c}\``).join(", ");

        const [result]: any = await this.pool.execute(
            `INSERT INTO \`${tableName}\` (${escapedColumns}) VALUES (${placeholders})`,
            columnNames.map((c) => row[c])
        );

        return { insertId: result.insertId };
    }
}
