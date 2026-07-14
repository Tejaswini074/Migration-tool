import { useEffect, useState } from "react";
import { deleteProject, getProjectDetail, getProjects } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { MigrationProjectDetail, MigrationProjectSummary } from "../types";

/**
 * pageSize is optional so this hook can serve both the paginated Projects list and the
 * unpaginated Schedules project picker with the same code - omitting it fetches everything.
 */
export function useProjects(options?: { pageSize?: number }) {
    const pageSize = options?.pageSize;
    const [projects, setProjects] = useState<MigrationProjectSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const { items, total: itemTotal } = await getProjects(
                pageSize ? { search: search || undefined, page, pageSize } : {}
            );
            setProjects(items);
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

    const handleDelete = async (projectId: number) => {
        setDeletingId(projectId);
        setError(null);
        try {
            await deleteProject(projectId);
            await refresh();
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setDeletingId(null);
        }
    };

    return {
        projects, total, loading, error, refresh,
        search, setSearch: (value: string) => { setSearch(value); setPage(1); },
        page, setPage,
        deletingId, handleDelete
    };
}

export function useProjectDetail(projectId: number) {
    const [project, setProject] = useState<MigrationProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const detail = await getProjectDetail(projectId);
                if (!cancelled) setProject(detail);
            } catch (err) {
                if (!cancelled) setError(extractErrorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    return { project, loading, error };
}
