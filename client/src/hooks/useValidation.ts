import { useEffect, useState } from "react";
import { validateProject } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { ConnectionState, ProjectValidationResult } from "../types";

export function useValidation(projectId: number, source: ConnectionState, destination: ConnectionState) {
    const [result, setResult] = useState<ProjectValidationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const runValidation = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await validateProject({
                projectId,
                sourceConnectionId: source.connectionId,
                destinationConnectionId: destination.connectionId
            });
            setResult(res);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runValidation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    return { result, loading, error, refresh: runValidation };
}
