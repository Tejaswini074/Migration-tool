import { useEffect, useState } from "react";
import { getMigrationStats } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { MigrationStats } from "../types";

export function useMigrationStats() {
    const [stats, setStats] = useState<MigrationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            setStats(await getMigrationStats());
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    return { stats, loading, error, refresh };
}
