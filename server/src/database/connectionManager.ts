import mysql from "mysql2/promise";
import { IConnector } from "../connectors/types";

class ConnectionManager {

    private connections: Map<string, IConnector> = new Map();

    add(id: string, connector: IConnector) {
        this.connections.set(id, connector);
    }

    get(id: string): IConnector | undefined {
        return this.connections.get(id);
    }

    remove(id: string) {
        this.connections.delete(id);
    }

    getAll() {
        return this.connections;
    }

    getMySqlPool(id: string): mysql.Pool | null {
        const connector = this.connections.get(id);
        if (!connector || connector.type !== "mysql") return null;
        return connector.getNativeHandle() as mysql.Pool;
    }

}

export default new ConnectionManager();
