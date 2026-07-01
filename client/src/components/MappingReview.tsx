import { Sparkles } from "lucide-react";
import { useMapping } from "../hooks/useMapping";
import type { ConnectionState } from "../types";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Button from "./ui/Button";
import Badge from "./ui/Badge";

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
        handleSave
    } = useMapping(source, destination, onProjectCreated);

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
                <Sparkles className="h-4 w-4 animate-pulse text-blue-500" />
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            {source.schema.map((table) => {
                const draft = tableMappings[table.tableName];
                const rec = recommendations.find((r) => r.sourceTable === table.tableName);

                return (
                    <Card key={table.tableName}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900">{table.tableName}</h4>
                                <p className="text-xs text-slate-500">{table.totalRows} row(s)</p>
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
                            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-500">
                                                Source column
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-500">
                                                Destination column
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-500">
                                                Transform
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {draft.columns.map((col, i) => {
                                            const destinationColumns =
                                                destination.schema.find(
                                                    (t) => t.tableName === draft.destinationTable
                                                )?.columns ?? [];

                                            return (
                                                <tr key={col.sourceColumn}>
                                                    <td className="px-4 py-2 text-slate-700">
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
                                                        <Select
                                                            value={col.transformRule}
                                                            onChange={(e) =>
                                                                handleColumnChange(
                                                                    table.tableName,
                                                                    i,
                                                                    "transformRule",
                                                                    e.target.value
                                                                )
                                                            }
                                                        >
                                                            <option value="">None</option>
                                                            <option value="uppercase">Uppercase</option>
                                                            <option value="lowercase">Lowercase</option>
                                                            <option value="trim">Trim</option>
                                                        </Select>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
