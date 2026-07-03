import { useEffect, useMemo, useState } from "react";
import {
    createProject,
    recommendTables,
    saveColumnMapping,
    saveTableMapping,
    setHighWaterColumn
} from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type {
    ColumnMappingDraft,
    ConnectionState,
    TableMappingDraft,
    TableRecommendation,
    TransformRule
} from "../types";

const serializeTransformRule = (rule: TransformRule | null) => (rule ? JSON.stringify(rule) : null);

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
            transformRule: null
        };
    });
};

const withColumns = (
    sourceTable: string,
    destinationTable: string,
    source: ConnectionState,
    destination: ConnectionState
): TableMappingDraft => ({
    sourceTable,
    destinationTable,
    columns: destinationTable ? buildColumnDrafts(sourceTable, destinationTable, source, destination) : [],
    highWaterColumn: null
});

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

                    initial[table.tableName] = withColumns(table.tableName, destinationTable, source, destination);
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
            [sourceTable]: withColumns(sourceTable, destinationTable, source, destination)
        }));
    };

    const handleHighWaterColumnChange = (sourceTable: string, column: string) => {
        setTableMappings((prev) => ({
            ...prev,
            [sourceTable]: { ...prev[sourceTable], highWaterColumn: column || null }
        }));
    };

    const handleColumnChange = (
        sourceTable: string,
        columnIndex: number,
        field: "destinationColumn",
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

    const handleTransformChange = (sourceTable: string, columnIndex: number, rule: TransformRule | null) => {
        setTableMappings((prev) => {
            const table = prev[sourceTable];
            const columns = table.columns.map((c, i) =>
                i === columnIndex ? { ...c, transformRule: rule } : c
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
                        transformRule: serializeTransformRule(col.transformRule)
                    });
                }

                if (table.highWaterColumn) {
                    await setHighWaterColumn(tableMappingId, table.highWaterColumn);
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
        handleTransformChange,
        handleHighWaterColumnChange,
        handleSave
    };
}
