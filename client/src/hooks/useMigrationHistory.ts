import { useEffect, useState } from "react";
import { downloadMigrationReport, getMigrationHistory } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { MigrationRunSummary } from "../types";

export function useMigrationHistory(connectionId: string | null) {
    const [runs, setRuns] = useState<MigrationRunSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

    const refresh = async () => {
        if (!connectionId) return;
        setLoading(true);
        setError(null);
        try {
            setRuns(await getMigrationHistory(connectionId));
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionId]);

    const downloadReport = async (runId: string, format: "csv" | "pdf") => {
        if (!connectionId) return;
        const key = `${runId}-${format}`;
        setDownloadingKey(key);
        setError(null);
        try {
            await downloadMigrationReport(connectionId, runId, format);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setDownloadingKey(null);
        }
    };

    return { runs, loading, error, refresh, downloadingKey, downloadReport };
}
