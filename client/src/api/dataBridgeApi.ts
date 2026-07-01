import { apiClient } from "./client";
import type { MigrationRun, TableRecommendation, TableSchema } from "./types";

export interface ConnectPayload {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
}

export const connectDatabase = async (payload: ConnectPayload) => {
    const { data } = await apiClient.post<{
        success: boolean;
        connectionId: string;
        database: string;
        message: string;
    }>("/database/connect", payload);
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
    connectionId: string;
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

export const saveTableMapping = async (payload: {
    connectionId: string;
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
    connectionId: string;
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

export const runMigration = async (payload: {
    projectId: number;
    sourceConnectionId: string;
    destinationConnectionId: string;
    metadataConnectionId: string;
}) => {
    const { data } = await apiClient.post<{ success: boolean; runId: string }>(
        "/migration/run",
        payload
    );
    return data.runId;
};

export const getMigrationStatus = async (runId: string) => {
    const { data } = await apiClient.get<{ success: boolean; run: MigrationRun }>(
        `/migration/status/${runId}`
    );
    return data.run;
};
