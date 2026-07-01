export type UserRole = "admin" | "user";

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
}

export interface ManagedUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    created_at: string;
}

export interface ColumnInfo {
    Field: string;
    Type: string;
    Null: string;
    Key: string;
    Default: unknown;
    Extra: string;
}

export interface ForeignKeyInfo {
    COLUMN_NAME: string;
    REFERENCED_TABLE_NAME: string;
    REFERENCED_COLUMN_NAME: string;
}

export interface TableSchema {
    tableName: string;
    totalRows: number;
    columns: ColumnInfo[];
    foreignKeys: ForeignKeyInfo[];
}

export interface ConnectionState {
    connectionId: string;
    database: string;
    host: string;
    port: string;
    schema: TableSchema[];
}

export interface TableRecommendation {
    sourceTable: string;
    destinationTable: string | null;
    confidence: number;
    reason: string[];
}

export type TransformRule = "" | "uppercase" | "lowercase" | "trim";

export interface ColumnMappingDraft {
    sourceColumn: string;
    destinationColumn: string;
    transformRule: TransformRule;
}

export interface TableMappingDraft {
    sourceTable: string;
    destinationTable: string;
    columns: ColumnMappingDraft[];
}

export type TableRunStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface TableRunState {
    tableMappingId: number;
    sourceTable: string;
    destinationTable: string;
    status: TableRunStatus;
    totalRows: number;
    migratedRows: number;
    error: string | null;
}

export interface MigrationRun {
    runId: string;
    projectId: number;
    status: "running" | "completed" | "failed";
    startedAt: string;
    finishedAt: string | null;
    tables: TableRunState[];
}

export interface MigrationRunSummary {
    id: number;
    run_id: string;
    project_id: number;
    project_name: string;
    source_database: string;
    destination_database: string;
    started_by_user_id: number;
    started_by_name: string;
    started_by_email: string;
    status: "running" | "completed" | "failed";
    started_at: string;
    finished_at: string | null;
}
