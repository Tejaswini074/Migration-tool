import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Rocket } from "lucide-react";
import { getMigrationStatus, runMigration } from "../api/dataBridgeApi";
import { extractErrorMessage } from "../api/client";
import type { ConnectionState, MigrationRun, TableRunStatus } from "../api/types";
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

export default function MigrationStep({ projectId, source, destination }: Props) {
    const [run, setRun] = useState<MigrationRun | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const startPolling = (runId: string) => {
        pollRef.current = setInterval(async () => {
            try {
                const latest = await getMigrationStatus(runId);
                setRun(latest);
                if (latest.status !== "running" && pollRef.current) {
                    clearInterval(pollRef.current);
                }
            } catch (err) {
                setError(extractErrorMessage(err));
                if (pollRef.current) clearInterval(pollRef.current);
            }
        }, 1500);
    };

    const handleStart = async () => {
        setStarting(true);
        setError(null);
        try {
            const runId = await runMigration({
                projectId,
                sourceConnectionId: source.connectionId,
                destinationConnectionId: destination.connectionId,
                metadataConnectionId: destination.connectionId
            });
            const initial = await getMigrationStatus(runId);
            setRun(initial);
            if (initial.status === "running") startPolling(runId);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            {!run && (
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                            <Rocket className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-slate-600">
                            Ready to migrate data from <span className="font-medium text-slate-900">{source.database}</span> to{" "}
                            <span className="font-medium text-slate-900">{destination.database}</span>.
                        </p>
                    </div>
                    <Button loading={starting} onClick={handleStart} className="mt-4">
                        Run Migration
                    </Button>
                </Card>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {run && (
                <Card>
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">Migration progress</h3>
                        <Badge tone={run.status === "completed" ? "green" : run.status === "failed" ? "red" : "blue"}>
                            {run.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                            {statusLabel[run.status] ?? run.status}
                        </Badge>
                    </div>

                    <div className="flex flex-col gap-5">
                        {run.tables.map((table) => {
                            const pct = table.totalRows > 0
                                ? Math.min(100, Math.round((table.migratedRows / table.totalRows) * 100))
                                : table.status === "completed" ? 100 : 0;

                            return (
                                <div key={table.tableMappingId}>
                                    <div className="mb-1.5 flex items-center justify-between text-sm">
                                        <span className="text-slate-700">
                                            {table.sourceTable} <span className="text-slate-400">&rarr;</span>{" "}
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
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-300",
                                                table.status === "failed" ? "bg-red-500" : "bg-blue-600"
                                            )}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {table.migratedRows} / {table.totalRows} row(s)
                                        {table.error && (
                                            <span className="ml-1 text-red-600">&mdash; {table.error}</span>
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
