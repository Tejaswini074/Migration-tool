import { apiClient } from "./client";
import type {
    MigrationRunSummary,
    MigrationRun,
    MigrationStats,
    MigrationProjectSummary,
    MigrationProjectDetail,
    MigrationSchedule,
    ScheduleConnectionConfig,
    ProjectValidationResult,
    FailedRow,
    TableRecommendation,
    TableSchema,
    PagedParams
} from "../types";

export interface ConnectPayload {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
    type?: "mysql" | "postgres";
}

export const connectDatabase = async (payload: ConnectPayload) => {
    const { data } = await apiClient.post<{
        success: boolean;
        connectionId: string;
        database: string;
        type: "mysql" | "postgres";
        message: string;
    }>("/database/connect", payload);
    return data;
};

export const connectCsv = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<{
        success: boolean;
        connectionId: string;
        database: string;
        type: "csv";
        tableName: string;
        message: string;
    }>("/database/connect-csv", form);
    return data;
};

export const disconnectDatabase = async (connectionId: string) => {
    const { data } = await apiClient.delete(`/database/disconnect/${connectionId}`);
    return data;
};

export const getDatabaseSchema = async (connectionId: string) => {
    const { data } = await apiClient.get<{ success: boolean; schema: TableSchema[] }>(
        `/schema/schema/${connectionId}`
    );
    return data.schema;
};

export const recommendTables = async (sourceConnectionId: string, destinationConnectionId: string) => {
    const { data } = await apiClient.post<{ success: boolean; recommendation: TableRecommendation[] }>(
        "/recommendation/tables",
        { sourceConnectionId, destinationConnectionId }
    );
    return data.recommendation;
};

export const createProject = async (payload: {
    projectName: string;
    sourceDatabase: string;
    destinationDatabase: string;
}) => {
    const { data } = await apiClient.post<{ success: boolean; projectId: number }>(
        "/mapping/project",
        payload
    );
    return data.projectId;
};

export const getProjects = async (params: PagedParams = {}) => {
    const { data } = await apiClient.get<{ success: boolean; projects: MigrationProjectSummary[]; total: number }>(
        "/mapping/projects",
        { params }
    );
    return { items: data.projects, total: data.total };
};

export const deleteProject = async (projectId: number) => {
    await apiClient.delete(`/mapping/project/${projectId}`);
};

export const getProjectDetail = async (projectId: number) => {
    const { data } = await apiClient.get<{ success: boolean; project: MigrationProjectDetail }>(
        `/mapping/project/${projectId}`
    );
    return data.project;
};

export const saveTableMapping = async (payload: {
    projectId: number;
    sourceTable: string;
    destinationTable: string;
}) => {
    const { data } = await apiClient.post<{ success: boolean; tableMappingId: number }>(
        "/mapping/table",
        payload
    );
    return data.tableMappingId;
};

export const saveColumnMapping = async (payload: {
    tableMappingId: number;
    sourceColumn: string;
    destinationColumn: string;
    transformRule?: string | null;
}) => {
    const { data } = await apiClient.post<{ success: boolean; columnMappingId: number }>(
        "/mapping/column",
        payload
    );
    return data.columnMappingId;
};

export interface NotificationSettings {
    webhookUrl: string | null;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
}

export const getNotificationSettings = async () => {
    const { data } = await apiClient.get<{ success: boolean; settings: NotificationSettings }>(
        "/notifications/settings"
    );
    return data.settings;
};

export const updateNotificationSettings = async (payload: NotificationSettings) => {
    await apiClient.put("/notifications/settings", payload);
};

export const previewMapping = async (payload: {
    sourceConnectionId: string;
    tableName: string;
    columns: { sourceColumn: string; destinationColumn: string; transformRule?: string | null }[];
}) => {
    const { data } = await apiClient.post<{
        success: boolean;
        rows: Record<string, { source: unknown; transformed: unknown }>[];
    }>("/mapping/preview", payload);
    return data.rows;
};

export const validateProject = async (payload: {
    projectId: number;
    sourceConnectionId: string;
    destinationConnectionId: string;
}) => {
    const { data } = await apiClient.post<{ success: boolean; result: ProjectValidationResult }>(
        "/validation/project",
        payload
    );
    return data.result;
};

export const runMigration = async (payload: {
    projectId: number;
    sourceConnectionId: string;
    destinationConnectionId: string;
    batchSize?: number;
    mode?: "full" | "incremental";
    insertMode?: "insert" | "upsert";
}) => {
    const { data } = await apiClient.post<{ success: boolean; runId: string }>(
        "/migration/run",
        payload
    );
    return data.runId;
};

export const getFailedRows = async (runId: string, tableMappingId?: number) => {
    const { data } = await apiClient.get<{ success: boolean; failedRows: FailedRow[] }>(
        `/migration/failed-rows/${runId}`,
        { params: tableMappingId ? { tableMappingId } : {} }
    );
    return data.failedRows;
};

export const getMigrationStatus = async (runId: string) => {
    const { data } = await apiClient.get<{ success: boolean; run: MigrationRun }>(
        `/migration/status/${runId}`
    );
    return data.run;
};

export const cancelMigration = async (runId: string) => {
    await apiClient.post(`/migration/cancel/${runId}`);
};

export const getMigrationStats = async () => {
    const { data } = await apiClient.get<{ success: boolean; stats: MigrationStats }>("/migration/stats");
    return data.stats;
};

export const getMigrationHistory = async (params: PagedParams = {}) => {
    const { data } = await apiClient.get<{ success: boolean; runs: MigrationRunSummary[]; total: number }>(
        "/migration/history",
        { params }
    );
    return { items: data.runs, total: data.total };
};

export const downloadMigrationReport = async (runId: string, format: "csv" | "pdf") => {
    const response = await apiClient.get(`/migration/report/${runId}`, {
        params: { format },
        responseType: "blob"
    });

    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `migration-report-${runId}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
};

export const setHighWaterColumn = async (tableMappingId: number, column: string | null) => {
    await apiClient.post(`/mapping/table/${tableMappingId}/high-water-column`, { column });
};

export const createSchedule = async (payload: {
    projectId: number;
    cronExpression: string;
    mode: "full" | "incremental";
    batchSize?: number;
    source: ScheduleConnectionConfig;
    destination: ScheduleConnectionConfig;
}) => {
    const { data } = await apiClient.post<{ success: boolean; scheduleId: number }>("/schedules", payload);
    return data.scheduleId;
};

export const getSchedules = async (params: PagedParams = {}) => {
    const { data } = await apiClient.get<{ success: boolean; schedules: MigrationSchedule[]; total: number }>(
        "/schedules",
        { params }
    );
    return { items: data.schedules, total: data.total };
};

export const toggleSchedule = async (scheduleId: number, isActive: boolean) => {
    await apiClient.patch(`/schedules/${scheduleId}/toggle`, { isActive });
};

export const deleteSchedule = async (scheduleId: number) => {
    await apiClient.delete(`/schedules/${scheduleId}`);
};

export const runScheduleNow = async (scheduleId: number) => {
    await apiClient.post(`/schedules/${scheduleId}/run-now`);
};
