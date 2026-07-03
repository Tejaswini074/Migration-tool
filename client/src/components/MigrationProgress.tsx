import { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Download, Loader2, Rocket } from "lucide-react";
import { useMigrationRun } from "../hooks/useMigrationRun";
import { getFailedRows } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { ConnectionState, FailedRow, TableRunStatus } from "../types";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Input from "./ui/Input";
import Select from "./ui/Select";
import { cn } from "../lib/cn";

interface Props {
    projectId: number;
    source: ConnectionState;
    destination: ConnectionState;
}

const statusLabel: Record<string, string> = {
    pending: "Pending",
    running: "Migrating...",
    completed: "Completed",
    completed_with_errors: "Completed with errors",
    failed: "Failed",
    skipped: "Skipped"
};

const statusTone: Record<TableRunStatus, "slate" | "blue" | "green" | "red" | "amber"> = {
    pending: "slate",
    running: "blue",
    completed: "green",
    completed_with_errors: "amber",
    failed: "red",
    skipped: "slate"
};

export default function MigrationProgress({ projectId, source, destination }: Props) {
    const { run, error, starting, handleStart, downloading, downloadReport } = useMigrationRun(
        projectId,
        source,
        destination
    );
    const [batchSize, setBatchSize] = useState("500");
    const [mode, setMode] = useState<"full" | "incremental">("full");

    return (
        <div className="flex flex-col gap-5">
            {!run && (
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                            <Rocket className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Ready to migrate data from <span className="font-medium text-slate-900 dark:text-white">{source.database}</span> to{" "}
                            <span className="font-medium text-slate-900 dark:text-white">{destination.database}</span>.
                        </p>
                    </div>

                    <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
                        <Input
                            label="Batch size"
                            type="number"
                            min={50}
                            max={5000}
                            step={50}
                            value={batchSize}
                            onChange={(e) => setBatchSize(e.target.value)}
                        />
                        <Select label="Sync mode" value={mode} onChange={(e) => setMode(e.target.value as "full" | "incremental")}>
                            <option value="full">Full sync</option>
                            <option value="incremental">Incremental (only new rows)</option>
                        </Select>
                    </div>

                    <Button loading={starting} onClick={() => handleStart(Number(batchSize) || undefined, mode)} className="mt-4">
                        Run Migration
                    </Button>
                </Card>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {run && (
                <Card>
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Migration progress</h3>
                        <div className="flex items-center gap-2">
                            <Badge
                                tone={
                                    run.status === "completed" ? "green"
                                        : run.status === "failed" ? "red"
                                            : run.status === "completed_with_errors" ? "amber" : "blue"
                                }
                            >
                                {run.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                                {statusLabel[run.status] ?? run.status}
                            </Badge>
                            {run.status !== "running" && (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        loading={downloading === "csv"}
                                        onClick={() => downloadReport("csv")}
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        CSV
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        loading={downloading === "pdf"}
                                        onClick={() => downloadReport("pdf")}
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        PDF
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        {run.tables.map((table) => {
                            const pct = table.totalRows > 0
                                ? Math.min(100, Math.round((table.migratedRows / table.totalRows) * 100))
                                : table.status === "completed" ? 100 : 0;

                            return (
                                <div key={table.tableMappingId}>
                                    <div className="mb-1.5 flex items-center justify-between text-sm">
                                        <span className="text-slate-700 dark:text-slate-300">
                                            {table.sourceTable} <span className="text-slate-400 dark:text-slate-500">&rarr;</span>{" "}
                                            {table.destinationTable}
                                        </span>
                                        <Badge tone={statusTone[table.status]}>
                                            {table.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                                            {table.status === "completed_with_errors" && <AlertTriangle className="h-3 w-3" />}
                                            {table.status === "failed" && <AlertCircle className="h-3 w-3" />}
                                            {table.status === "running" && (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            )}
                                            {statusLabel[table.status] ?? table.status}
                                        </Badge>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-300",
                                                table.status === "failed"
                                                    ? "bg-red-500"
                                                    : table.status === "completed_with_errors"
                                                        ? "bg-amber-500"
                                                        : "bg-linear-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400"
                                            )}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {table.migratedRows} / {table.totalRows} row(s) migrated
                                        {table.failedRows > 0 && (
                                            <span className="text-amber-600 dark:text-amber-400"> &middot; {table.failedRows} failed</span>
                                        )}
                                        {table.error && (
                                            <span className="ml-1 text-red-600 dark:text-red-400">&mdash; {table.error}</span>
                                        )}
                                    </p>

                                    {table.failedRows > 0 && run.status !== "running" && (
                                        <FailedRowsPanel runId={run.runId} tableMappingId={table.tableMappingId} count={table.failedRows} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}

function FailedRowsPanel({ runId, tableMappingId, count }: { runId: string; tableMappingId: number; count: number }) {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<FailedRow[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next && rows === null) {
            setLoading(true);
            setError(null);
            try {
                setRows(await getFailedRows(runId, tableMappingId));
            } catch (err) {
                setError(extractErrorMessage(err));
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={toggle}
                className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
            >
                <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
                View {count} failed row{count === 1 ? "" : "s"}
            </button>

            {open && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5">
                    {loading && <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Loading...</p>}
                    {error && <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
                    {rows && rows.length === 0 && (
                        <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No details available.</p>
                    )}
                    {rows && rows.map((r) => (
                        <div key={r.id} className="border-b border-amber-100 px-3 py-1.5 text-xs last:border-b-0 dark:border-amber-500/10">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                {r.row_identifier ? `Row ${r.row_identifier}` : "Row"}
                            </span>
                            <span className="ml-1.5 text-slate-500 dark:text-slate-400">{r.error_message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
