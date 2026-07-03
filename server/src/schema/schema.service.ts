import { IConnector } from "../connectors/types";

class SchemaService {

    async getTables(connector: IConnector) {
        return connector.getTables();
    }

    async getColumns(connector: IConnector, tableName: string) {
        return connector.getColumns(tableName);
    }

    async getForeignKeys(connector: IConnector, tableName: string) {
        return connector.getForeignKeys(tableName);
    }

    async getSchema(connector: IConnector) {
        return connector.getSchema();
    }
}

export default new SchemaService();
