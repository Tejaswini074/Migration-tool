import mysql from "mysql2/promise";

class SchemaService {

    async getTables(connection: mysql.Connection) {

        const [tables]: any = await connection.query("SHOW TABLES");
        const result = [];

        for (const table of tables) {
            const tableName = String(Object.values(table)[0]);
            const [count]: any = await connection.query(`SELECT COUNT(*) total FROM \`${tableName}\``);
            result.push({
                tableName,
                totalRows: count[0].total
            });
        }
        return result;
    }

    async getColumns(connection: mysql.Connection, tableName: string) {
        const [columns]: any = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
        return columns;
    }

    async getForeignKeys(connection: mysql.Connection, tableName: string) {

        const [db]: any = await connection.query("SELECT DATABASE() db");
        const database = db[0].db;
        const [foreignKeys]: any = await connection.query(

            `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
              FROM information_schema.KEY_COLUMN_USAGE WHERE
             TABLE_SCHEMA=? AND TABLE_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL`,
            [database, tableName]
        );
        return foreignKeys;
    }

    async getSchema(connection: mysql.Connection) {
        const tables = await this.getTables(connection);
        const schema = [];
        for (const table of tables) {

            const columns = await this.getColumns(connection, table.tableName);

            const foreignKeys = await this.getForeignKeys(connection, table.tableName);

            schema.push({
                tableName: table.tableName,
                totalRows: table.totalRows,
                columns,
                foreignKeys
            });
        }
        return schema;
    }
}

export default new SchemaService();