import { AlertCircle, CheckCircle2, Download, Loader2, Rocket } from "lucide-react";
import { useMigrationRun } from "../hooks/useMigrationRun";
import type { ConnectionState, TableRunStatus } from "../types";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
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
    failed: "Failed",
    skipped: "Skipped"
};

const statusTone: Record<TableRunStatus, "slate" | "blue" | "green" | "red"> = {
    pending: "slate",
    running: "blue",
    completed: "green",
    failed: "red",
    skipped: "slate"
};

export default function MigrationProgress({ projectId, source, destination }: Props) {
    const { run, error, starting, handleStart, downloading, downloadReport } = useMigrationRun(
        projectId,
        source,
        destination
    );

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
                    <Button loading={starting} onClick={handleStart} className="mt-4">
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
                            <Badge tone={run.status === "completed" ? "green" : run.status === "failed" ? "red" : "blue"}>
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
                                                table.status === "failed" ? "bg-red-500" : "bg-indigo-600 dark:bg-indigo-400"
                                            )}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {table.migratedRows} / {table.totalRows} row(s)
                                        {table.error && (
                                            <span className="ml-1 text-red-600 dark:text-red-400">&mdash; {table.error}</span>
                                        )}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
