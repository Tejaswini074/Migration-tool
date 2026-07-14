import { ColumnInfo, ForeignKeyInfo, IConnector, InsertResult, TableInfo, TableSchema } from "./types";

/**
 * Turns an arbitrary CSV header/filename into a safe SQL identifier - table/column names
 * flow into backtick-interpolated SQL downstream (see validateIdentifier.ts), so anything
 * outside [A-Za-z0-9_] has to be stripped here, not just at the mapping-save boundary.
 */
const sanitizeIdentifier = (raw: string, fallback: string): string => {
    const cleaned = raw.trim().replace(/[^A-Za-z0-9_]/g, "_").replace(/^_+/, "");
    const withPrefix = /^[A-Za-z]/.test(cleaned) ? cleaned : `c_${cleaned}`;
    const trimmed = withPrefix.slice(0, 128);
    return trimmed.length > 0 && /[A-Za-z0-9]/.test(trimmed) ? trimmed : fallback;
};

const dedupeNames = (names: string[]): string[] => {
    const seen = new Map<string, number>();
    return names.map((name) => {
        const count = seen.get(name) ?? 0;
        seen.set(name, count + 1);
        return count === 0 ? name : `${name}_${count + 1}`;
    });
};

const inferColumnType = (values: string[]): string => {
    const nonEmpty = values.filter((v) => v !== "" && v !== null && v !== undefined);
    if (nonEmpty.length === 0) return "varchar(255)";

    if (nonEmpty.every((v) => /^-?\d+$/.test(v))) return "int";
    if (nonEmpty.every((v) => /^-?\d+(\.\d+)?$/.test(v))) return "decimal(18,4)";
    if (nonEmpty.every((v) => !Number.isNaN(Date.parse(v)))) return "datetime";

    const maxLen = Math.max(...nonEmpty.map((v) => v.length));
    return `varchar(${Math.max(maxLen, 50)})`;
};

/**
 * Read-only connector over an in-memory CSV file, parsed once at connect time. CSV is a
 * source-only concept here (there's no meaningful "migrate into a CSV file" destination in
 * this app), so `insertRow` throws rather than silently doing nothing.
 */
export class CsvConnector implements IConnector {

    readonly type = "csv" as const;
    private readonly tableName: string;
    private readonly columnNames: string[];
    private readonly columns: ColumnInfo[];
    private rows: Record<string, any>[];

    constructor(tableName: string, rawRows: Record<string, string>[]) {
        this.tableName = sanitizeIdentifier(tableName, "csv_import");

        const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
        const sanitizedHeaders = dedupeNames(
            rawHeaders.map((h, i) => sanitizeIdentifier(h, `column_${i + 1}`))
        );
        this.columnNames = sanitizedHeaders;

        this.rows = rawRows.map((raw) => {
            const row: Record<string, any> = {};
            rawHeaders.forEach((rawHeader, i) => {
                const value = raw[rawHeader];
                row[sanitizedHeaders[i]] = value === "" || value === undefined ? null : value;
            });
            return row;
        });

        this.columns = sanitizedHeaders.map((name) => ({
            Field: name,
            Type: inferColumnType(this.rows.map((r) => (r[name] === null ? "" : String(r[name])))),
            Null: "YES",
            Key: "",
            Default: null,
            Extra: ""
        }));
    }

    getNativeHandle(): Record<string, any>[] {
        return this.rows;
    }

    async testConnection(): Promise<void> {
        if (this.rows.length === 0) {
            throw new Error("CSV file has no data rows");
        }
    }

    async close(): Promise<void> {
        this.rows = [];
    }

    private assertTable(tableName: string): void {
        if (tableName !== this.tableName) {
            throw new Error(`Unknown CSV table: ${tableName}`);
        }
    }

    async getTables(): Promise<TableInfo[]> {
        return [{ tableName: this.tableName, totalRows: this.rows.length }];
    }

    async getColumns(tableName: string): Promise<ColumnInfo[]> {
        this.assertTable(tableName);
        return this.columns;
    }

    async getForeignKeys(): Promise<ForeignKeyInfo[]> {
        return [];
    }

    async getSchema(): Promise<TableSchema[]> {
        return [{
            tableName: this.tableName,
            totalRows: this.rows.length,
            columns: this.columns,
            foreignKeys: []
        }];
    }

    async getPrimaryKeyColumn(): Promise<string | null> {
        return null;
    }

    async countRows(tableName: string): Promise<number> {
        this.assertTable(tableName);
        return this.rows.length;
    }

    async readBatch(tableName: string, limit: number, offset: number): Promise<Record<string, any>[]> {
        this.assertTable(tableName);
        return this.rows.slice(offset, offset + limit);
    }

    async insertRow(): Promise<InsertResult> {
        throw new Error("CSV connections can only be used as a migration source, not a destination");
    }

    async countNulls(tableName: string, columnName: string): Promise<number> {
        this.assertTable(tableName);
        return this.rows.filter((r) => r[columnName] === null).length;
    }

    async countDuplicateValues(tableName: string, columnName: string): Promise<number> {
        this.assertTable(tableName);
        const counts = new Map<string, number>();
        for (const row of this.rows) {
            const value = row[columnName];
            if (value === null) continue;
            const key = String(value);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        let duplicates = 0;
        for (const count of counts.values()) {
            if (count > 1) duplicates += count;
        }
        return duplicates;
    }
}
