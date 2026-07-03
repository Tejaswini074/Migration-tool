import { useEffect, useState } from "react";
import { deleteProject, getProjectDetail, getProjects } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { MigrationProjectDetail, MigrationProjectSummary } from "../types";

export function useProjects() {
    const [projects, setProjects] = useState<MigrationProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            setProjects(await getProjects());
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

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

    return { projects, loading, error, refresh, deletingId, handleDelete };
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
