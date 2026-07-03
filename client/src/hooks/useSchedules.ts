import { useEffect, useState } from "react";
import {
    createSchedule,
    deleteSchedule,
    getSchedules,
    runScheduleNow,
    toggleSchedule
} from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { MigrationSchedule, ScheduleConnectionConfig } from "../types";

export function useSchedules() {
    const [schedules, setSchedules] = useState<MigrationSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            setSchedules(await getSchedules());
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const handleCreate = async (payload: {
        projectId: number;
        cronExpression: string;
        mode: "full" | "incremental";
        batchSize?: number;
        source: ScheduleConnectionConfig;
        destination: ScheduleConnectionConfig;
    }) => {
        setError(null);
        try {
            await createSchedule(payload);
            await refresh();
            return true;
        } catch (err) {
            setError(extractErrorMessage(err));
            return false;
        }
    };

    const handleToggle = async (scheduleId: number, isActive: boolean) => {
        setBusyId(scheduleId);
        setError(null);
        try {
            await toggleSchedule(scheduleId, isActive);
            await refresh();
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (scheduleId: number) => {
        setBusyId(scheduleId);
        setError(null);
        try {
            await deleteSchedule(scheduleId);
            await refresh();
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    const handleRunNow = async (scheduleId: number) => {
        setBusyId(scheduleId);
        setError(null);
        try {
            await runScheduleNow(scheduleId);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setBusyId(null);
        }
    };

    return { schedules, loading, error, busyId, refresh, handleCreate, handleToggle, handleDelete, handleRunNow };
}
