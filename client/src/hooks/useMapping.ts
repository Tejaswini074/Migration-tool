import { useEffect, useMemo, useState } from "react";
import {
    createProject,
    recommendTables,
    saveColumnMapping,
    saveTableMapping
} from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type {
    ColumnMappingDraft,
    ConnectionState,
    TableMappingDraft,
    TableRecommendation,
    TransformRule
} from "../types";

const SKIP = "";

const buildColumnDrafts = (
    sourceTable: string,
    destinationTable: string,
    source: ConnectionState,
    destination: ConnectionState
): ColumnMappingDraft[] => {
    const sourceColumns = source.schema.find((t) => t.tableName === sourceTable)?.columns ?? [];
    const destinationColumns = destination.schema.find((t) => t.tableName === destinationTable)?.columns ?? [];

    return sourceColumns.map((col) => {
        const match = destinationColumns.find(
            (d) => d.Field.toLowerCase() === col.Field.toLowerCase()
        );
        return {
            sourceColumn: col.Field,
            destinationColumn: match ? match.Field : SKIP,
            transformRule: "" as TransformRule
        };
    });
};

export function useMapping(
    source: ConnectionState,
    destination: ConnectionState,
    onProjectCreated: (projectId: number) => void
) {
    const [recommendations, setRecommendations] = useState<TableRecommendation[]>([]);
    const [tableMappings, setTableMappings] = useState<Record<string, TableMappingDraft>>({});
    const [projectName, setProjectName] = useState(`${source.database}-to-${destination.database}`);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const recs = await recommendTables(source.connectionId, destination.connectionId);
                if (cancelled) return;

                setRecommendations(recs);

                const initial: Record<string, TableMappingDraft> = {};
                for (const table of source.schema) {
                    const rec = recs.find((r) => r.sourceTable === table.tableName);
                    const destinationTable = rec && rec.confidence >= 50 && rec.destinationTable
                        ? rec.destinationTable
                        : SKIP;

                    initial[table.tableName] = {
                        sourceTable: table.tableName,
                        destinationTable,
                        columns: destinationTable
                            ? buildColumnDrafts(table.tableName, destinationTable, source, destination)
                            : []
                    };
                }
                setTableMappings(initial);
            } catch (err) {
                if (!cancelled) setError(extractErrorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source.connectionId, destination.connectionId]);

    const acceptedTables = useMemo(
        () => Object.values(tableMappings).filter((t) => t.destinationTable),
        [tableMappings]
    );

    const handleDestinationTableChange = (sourceTable: string, destinationTable: string) => {
        setTableMappings((prev) => ({
            ...prev,
            [sourceTable]: {
                sourceTable,
                destinationTable,
                columns: destinationTable
                    ? buildColumnDrafts(sourceTable, destinationTable, source, destination)
                    : []
            }
        }));
    };

    const handleColumnChange = (
        sourceTable: string,
        columnIndex: number,
        field: "destinationColumn" | "transformRule",
        value: string
    ) => {
        setTableMappings((prev) => {
            const table = prev[sourceTable];
            const columns = table.columns.map((c, i) =>
                i === columnIndex ? { ...c, [field]: value } : c
            );
            return { ...prev, [sourceTable]: { ...table, columns } };
        });
    };

    const handleSave = async () => {
        if (!projectName.trim() || acceptedTables.length === 0) return;

        setSaving(true);
        setError(null);
        try {
            const projectId = await createProject({
                projectName: projectName.trim(),
                sourceDatabase: source.database,
                destinationDatabase: destination.database
            });

            for (const table of acceptedTables) {
                const tableMappingId = await saveTableMapping({
                    projectId,
                    sourceTable: table.sourceTable,
                    destinationTable: table.destinationTable
                });

                for (const col of table.columns.filter((c) => c.destinationColumn)) {
                    await saveColumnMapping({
                        tableMappingId,
                        sourceColumn: col.sourceColumn,
                        destinationColumn: col.destinationColumn,
                        transformRule: col.transformRule || null
                    });
                }
            }

            onProjectCreated(projectId);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return {
        recommendations,
        tableMappings,
        projectName,
        setProjectName,
        loading,
        saving,
        error,
        acceptedTables,
        handleDestinationTableChange,
        handleColumnChange,
        handleSave
    };
}
