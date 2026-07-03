import { ConnectionConfig, IConnector } from "./types";
import { MySqlConnector } from "./mysqlConnector";
import { PostgresConnector } from "./postgresConnector";

export const createConnector = (config: ConnectionConfig): IConnector => {
    switch (config.type) {
        case "mysql":
            return new MySqlConnector(config);
        case "postgres":
            return new PostgresConnector(config);
        default:
            throw new Error(`Unsupported connector type: ${config.type}`);
    }
};
