import { useEffect, useRef, useState } from "react";
import { cancelMigration, downloadMigrationReport, getMigrationStatus, runMigration } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { ConnectionState, MigrationRun } from "../types";

export function useMigrationRun(projectId: number, source: ConnectionState, destination: ConnectionState) {
    const [run, setRun] = useState<MigrationRun | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);
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

    const handleStart = async (batchSize?: number, mode?: "full" | "incremental") => {
        setStarting(true);
        setError(null);
        try {
            const runId = await runMigration({
                projectId,
                sourceConnectionId: source.connectionId,
                destinationConnectionId: destination.connectionId,
                batchSize,
                mode
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

    const handleCancel = async () => {
        if (!run) return;
        setCancelling(true);
        setError(null);
        try {
            await cancelMigration(run.runId);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setCancelling(false);
        }
    };

    const downloadReport = async (format: "csv" | "pdf") => {
        if (!run) return;
        setDownloading(format);
        setError(null);
        try {
            await downloadMigrationReport(run.runId, format);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setDownloading(null);
        }
    };

    return { run, error, starting, handleStart, cancelling, handleCancel, downloading, downloadReport };
}
