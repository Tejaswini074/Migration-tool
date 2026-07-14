export type ConnectorType = "mysql" | "postgres" | "csv";

export interface ColumnInfo {
    Field: string;
    Type: string;
    Null: "YES" | "NO";
    Key: string;
    Default: any;
    Extra: string;
}

export interface ForeignKeyInfo {
    COLUMN_NAME: string;
    REFERENCED_TABLE_NAME: string;
    REFERENCED_COLUMN_NAME: string;
}

export interface TableInfo {
    tableName: string;
    totalRows: number;
}

export interface TableSchema {
    tableName: string;
    totalRows: number;
    columns: ColumnInfo[];
    foreignKeys: ForeignKeyInfo[];
}

export interface ConnectionConfig {
    type: ConnectorType;
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

export interface InsertResult {
    insertId?: any;
}


export interface IConnector {
    readonly type: ConnectorType;

    testConnection(): Promise<void>;
    close(): Promise<void>;

    getTables(): Promise<TableInfo[]>;
    getColumns(tableName: string): Promise<ColumnInfo[]>;
    getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]>;
    getSchema(): Promise<TableSchema[]>;

    getPrimaryKeyColumn(tableName: string): Promise<string | null>;
    countRows(tableName: string): Promise<number>;
    readBatch(tableName: string, limit: number, offset: number): Promise<Record<string, any>[]>;
    /** Incremental sync: only rows where `column` is greater than `sinceValue`. */
    readBatchSince?(
        tableName: string, column: string, sinceValue: any, limit: number, offset: number
    ): Promise<Record<string, any>[]>;
    insertRow(tableName: string, row: Record<string, any>): Promise<InsertResult>;
    /**
     * Insert-or-update: if a row already exists matching `conflictColumns` (typically the
     * destination's primary key), update it in place instead of erroring on the unique/PK
     * violation a plain `insertRow` would hit. Optional because it's meaningless for a
     * read-only source like CsvConnector.
     */
    upsertRow?(tableName: string, row: Record<string, any>, conflictColumns: string[]): Promise<InsertResult>;

    countNulls(tableName: string, columnName: string): Promise<number>;
    countDuplicateValues(tableName: string, columnName: string): Promise<number>;

    getNativeHandle(): unknown;
}
