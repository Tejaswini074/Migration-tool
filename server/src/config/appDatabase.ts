import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export const initAppDatabase = async (): Promise<mysql.Pool> => {

    if (pool) return pool;

    const host = process.env.APP_DB_HOST || "localhost";
    const port = Number(process.env.APP_DB_PORT) || 3306;
    const user = process.env.APP_DB_USER || "root";
    const password = process.env.APP_DB_PASSWORD || "";
    const database = process.env.APP_DB_NAME || "databridge_app";

    const bootstrapConnection = await mysql.createConnection({ host, port, user, password });
    await bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await bootstrapConnection.end();

    pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10
    });

    return pool;
};

export const getAppDatabase = (): mysql.Pool => {
    if (!pool) {
        throw new Error("App database not initialized. Call initAppDatabase() before handling requests.");
    }
    return pool;
};
