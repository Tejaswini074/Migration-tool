import { IConnector } from "../connectors/types";

export interface OrderResult {
    order: any[];
    hasCycle: boolean;
    cycleTables: string[];
}

export async function resolveTableOrder(tables: any[], destinationConnection: IConnector): Promise<OrderResult> {

    const destNames = new Set(tables.map((t) => t.destination_table));
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    tables.forEach((t) => {
        inDegree.set(t.destination_table, 0);
        graph.set(t.destination_table, []);
    });

    for (const t of tables) {
        const foreignKeys = await destinationConnection.getForeignKeys(t.destination_table);
        for (const fk of foreignKeys) {
            const parent = fk.REFERENCED_TABLE_NAME;
            if (destNames.has(parent) && parent !== t.destination_table) {
                graph.get(parent)!.push(t.destination_table);
                inDegree.set(t.destination_table, (inDegree.get(t.destination_table) || 0) + 1);
            }
        }
    }

    const queue: string[] = [];
    inDegree.forEach((degree, name) => {
        if (degree === 0) queue.push(name);
    });

    const orderNames: string[] = [];
    while (queue.length) {
        const name = queue.shift()!;
        orderNames.push(name);
        (graph.get(name) || []).forEach((child) => {
            inDegree.set(child, inDegree.get(child)! - 1);
            if (inDegree.get(child) === 0) queue.push(child);
        });
    }

    const byName = new Map(tables.map((t) => [t.destination_table, t]));

    if (orderNames.length !== tables.length) {
        const cycleTables = tables
            .map((t) => t.destination_table)
            .filter((name) => !orderNames.includes(name));
        return { order: tables, hasCycle: true, cycleTables };
    }

    return { order: orderNames.map((name) => byName.get(name)), hasCycle: false, cycleTables: [] };
}
