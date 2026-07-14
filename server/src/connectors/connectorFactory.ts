import { ConnectionConfig, IConnector } from "./types";
import { MySqlConnector } from "./mysqlConnector";
import { PostgresConnector } from "./postgresConnector";
import { CsvConnector } from "./csvConnector";

export const createConnector = (config: ConnectionConfig): IConnector => {
    switch (config.type) {
        case "mysql":
            return new MySqlConnector(config);
        case "postgres":
            return new PostgresConnector(config);
        case "csv":
            throw new Error("CSV connections are created via createCsvConnector, not createConnector");
        default:
            throw new Error(`Unsupported connector type: ${config.type}`);
    }
};

/** CSV has no host/port/credentials, so it doesn't fit through `ConnectionConfig` like the DB connectors. */
export const createCsvConnector = (tableName: string, rows: Record<string, string>[]): IConnector =>
    new CsvConnector(tableName, rows);
