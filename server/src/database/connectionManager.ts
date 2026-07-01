import mysql from "mysql2/promise";

class ConnectionManager {

    private connections: Map<string, mysql.Connection> = new Map();

    add(id: string, connection: mysql.Connection) {
        this.connections.set(id, connection);
    }

    get(id: string) {
        return this.connections.get(id);
    }

    remove(id: string) {
        this.connections.delete(id);
    }

    getAll() {
        return this.connections;
    }

}

export default new ConnectionManager();