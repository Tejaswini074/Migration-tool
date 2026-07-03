import { ConnectionConfig, IConnector } from "./types";
import { MySqlConnector } from "./mysqlConnector";

export const createConnector = (config: ConnectionConfig): IConnector => {
    switch (config.type) {
        case "mysql":
            return new MySqlConnector(config);
        default:
            throw new Error(`Unsupported connector type: ${config.type}`);
    }
};
