import mysql from "mysql2/promise";
import { IConnector } from "../connectors/types";

interface Entry {
    connector: IConnector;
    ownerId: number;
}

class ConnectionManager {

    private connections: Map<string, Entry> = new Map();

    /** Every connection is tied to the user who opened it - nothing else may read or use it. */
    add(id: string, connector: IConnector, ownerId: number) {
        this.connections.set(id, { connector, ownerId });
    }

    /** Trusted/internal accessor - no ownership check. Only for code that isn't handling a request from an arbitrary user (e.g. the scheduler tearing down its own just-created connections). */
    get(id: string): IConnector | undefined {
        return this.connections.get(id)?.connector;
    }

    /** Request-facing accessor - returns the connector only if the requester owns it or is an admin. */
    getOwned(id: string, requesterId: number, isAdmin: boolean): IConnector | undefined {
        const entry = this.connections.get(id);
        if (!entry) return undefined;
        if (!isAdmin && entry.ownerId !== requesterId) return undefined;
        return entry.connector;
    }

    remove(id: string) {
        this.connections.delete(id);
    }

    /** Every active connection, owner id included - trusted/internal (e.g. process-wide diagnostics). */
    getAll() {
        return this.connections;
    }

    /** Active connections visible to one requester - their own, or everyone's if admin. */
    getAllOwned(requesterId: number, isAdmin: boolean) {
        const visible: { connectionId: string; type: string }[] = [];
        this.connections.forEach((entry, connectionId) => {
            if (isAdmin || entry.ownerId === requesterId) {
                visible.push({ connectionId, type: entry.connector.type });
            }
        });
        return visible;
    }

    getMySqlPool(id: string): mysql.Pool | null {
        const connector = this.get(id);
        if (!connector || connector.type !== "mysql") return null;
        return connector.getNativeHandle() as mysql.Pool;
    }

}

export default new ConnectionManager();
