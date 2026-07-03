import { useState } from "react";
import { ChevronDown, Columns3, Eye, Sparkles } from "lucide-react";
import { useMapping } from "../hooks/useMapping";
import { previewMapping } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import { cn } from "../lib/cn";
import type { ColumnMappingDraft, ConnectionState } from "../types";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import TransformEditor from "./TransformEditor";

interface Props {
    source: ConnectionState;
    destination: ConnectionState;
    onProjectCreated: (projectId: number) => void;
}

const SKIP = "";

const confidenceTone = (confidence: number) =>
    confidence >= 80 ? "green" : confidence >= 50 ? "amber" : "slate";

export default function MappingReview({ source, destination, onProjectCreated }: Props) {
    const {
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
    } = useMapping(source, destination, onProjectCreated);

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4 animate-pulse text-indigo-500 dark:text-indigo-400" />
                Analyzing schemas and generating suggestions...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <Input
                    label="Project name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                />
            </Card>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {source.schema.map((table) => {
                const draft = tableMappings[table.tableName];
                const rec = recommendations.find((r) => r.sourceTable === table.tableName);

                return (
                    <Card key={table.tableName}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                                    <Columns3 className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{table.tableName}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{table.totalRows} row(s)</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {rec && rec.destinationTable && (
                                    <Badge tone={confidenceTone(rec.confidence)} title={rec.reason.join(", ")}>
                                        {rec.confidence}% match
                                    </Badge>
                                )}
                                <Select
                                    value={draft?.destinationTable ?? SKIP}
                                    onChange={(e) =>
                                        handleDestinationTableChange(table.tableName, e.target.value)
                                    }
                                    className="w-56"
                                >
                                    <option value={SKIP}>-- Skip this table --</option>
                                    {destination.schema.map((d) => (
                                        <option key={d.tableName} value={d.tableName}>
                                            {d.tableName}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {draft?.destinationTable && (
                            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-white/5">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400">
                                                Source column
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400">
                                                Destination column
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400">
                                                Transform
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {draft.columns.map((col, i) => {
                                            const destinationColumns =
                                                destination.schema.find(
                                                    (t) => t.tableName === draft.destinationTable
                                                )?.columns ?? [];

                                            return (
                                                <tr key={col.sourceColumn}>
                                                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                                        {col.sourceColumn}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <Select
                                                            value={col.destinationColumn}
                                                            onChange={(e) =>
                                                                handleColumnChange(
                                                                    table.tableName,
                                                                    i,
                                                                    "destinationColumn",
                                                                    e.target.value
                                                                )
                                                            }
                                                        >
                                                            <option value={SKIP}>-- Skip --</option>
                                                            {destinationColumns.map((d) => (
                                                                <option key={d.Field} value={d.Field}>
                                                                    {d.Field}
                                                                </option>
                                                            ))}
                                                        </Select>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <TransformEditor
                                                            value={col.transformRule}
                                                            onChange={(rule) =>
                                                                handleTransformChange(table.tableName, i, rule)
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {draft?.destinationTable && draft.columns.some((c) => c.destinationColumn) && (
                            <PreviewPanel
                                sourceConnectionId={source.connectionId}
                                tableName={table.tableName}
                                columns={draft.columns.filter((c) => c.destinationColumn)}
                            />
                        )}

                        {draft?.destinationTable && (
                            <div className="mt-3 max-w-56">
                                <Select
                                    label="Track changes using (for incremental sync)"
                                    value={draft.highWaterColumn ?? ""}
                                    onChange={(e) => handleHighWaterColumnChange(table.tableName, e.target.value)}
                                >
                                    <option value="">-- Not tracked --</option>
                                    {table.columns.map((c) => (
                                        <option key={c.Field} value={c.Field}>{c.Field}</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                    </Card>
                );
            })}

            <div className="flex justify-end">
                <Button
                    loading={saving}
                    disabled={!projectName.trim() || acceptedTables.length === 0}
                    onClick={handleSave}
                >
                    Create Project & Save Mapping ({acceptedTables.length} table(s))
                </Button>
            </div>
        </div>
    );
}

function PreviewPanel({
    sourceConnectionId,
    tableName,
    columns
}: {
    sourceConnectionId: string;
    tableName: string;
    columns: ColumnMappingDraft[];
}) {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<Record<string, { source: unknown; transformed: unknown }>[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next && rows === null) {
            setLoading(true);
            setError(null);
            try {
                setRows(
                    await previewMapping({
                        sourceConnectionId,
                        tableName,
                        columns: columns.map((c) => ({
                            sourceColumn: c.sourceColumn,
                            destinationColumn: c.destinationColumn,
                            transformRule: c.transformRule ? JSON.stringify(c.transformRule) : null
                        }))
                    })
                );
            } catch (err) {
                setError(extractErrorMessage(err));
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="mt-3">
            <button
                type="button"
                onClick={toggle}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
                <Eye className="h-3.5 w-3.5" />
                Preview sample rows
                <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
                    {loading && <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Loading sample...</p>}
                    {error && <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
                    {rows && rows.length === 0 && (
                        <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No rows to preview.</p>
                    )}
                    {rows && rows.length > 0 && (
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 dark:bg-white/5">
                                <tr>
                                    {columns.map((c) => (
                                        <th key={c.destinationColumn} className="px-3 py-1.5 text-left font-medium text-slate-500 dark:text-slate-400">
                                            {c.destinationColumn}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {rows.map((row, i) => (
                                    <tr key={i}>
                                        {columns.map((c) => {
                                            const cell = row[c.destinationColumn];
                                            const changed = cell && cell.source !== cell.transformed;
                                            return (
                                                <td key={c.destinationColumn} className="px-3 py-1.5 text-slate-600 dark:text-slate-400">
                                                    {changed ? (
                                                        <span>
                                                            <span className="text-slate-400 line-through dark:text-slate-600">{String(cell.source)}</span>
                                                            {" → "}
                                                            <span className="font-medium text-slate-800 dark:text-slate-200">{String(cell.transformed)}</span>
                                                        </span>
                                                    ) : (
                                                        String(cell?.transformed ?? "")
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
