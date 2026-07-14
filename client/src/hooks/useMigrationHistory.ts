import { useEffect, useState } from "react";
import { downloadMigrationReport, getMigrationHistory } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { MigrationRunSummary } from "../types";

const PAGE_SIZE = 10;

export function useMigrationHistory() {
    const [runs, setRuns] = useState<MigrationRunSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearchState] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const { items, total: itemTotal } = await getMigrationHistory({
                search: search || undefined,
                page,
                pageSize: PAGE_SIZE
            });
            setRuns(items);
            setTotal(itemTotal);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search]);

    const setSearch = (value: string) => {
        setSearchState(value);
        setPage(1);
    };

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

    return {
        runs, total, loading, error, refresh,
        search, setSearch, page, setPage, pageSize: PAGE_SIZE,
        downloadingKey, downloadReport
    };
}
