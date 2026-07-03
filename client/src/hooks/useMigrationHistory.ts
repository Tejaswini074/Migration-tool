import { useEffect, useState } from "react";
import { downloadMigrationReport, getMigrationHistory } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { MigrationRunSummary } from "../types";

export function useMigrationHistory() {
    const [runs, setRuns] = useState<MigrationRunSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            setRuns(await getMigrationHistory());
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const downloadReport = async (runId: string, format: "csv" | "pdf") => {
        const key = `${runId}-${format}`;
        setDownloadingKey(key);
        setError(null);
        try {
            await downloadMigrationReport(runId, format);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setDownloadingKey(null);
        }
    };

    return { runs, loading, error, refresh, downloadingKey, downloadReport };
}
