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

const PAGE_SIZE = 10;

export function useSchedules() {
    const [schedules, setSchedules] = useState<MigrationSchedule[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearchState] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const { items, total: itemTotal } = await getSchedules({
                search: search || undefined,
                page,
                pageSize: PAGE_SIZE
            });
            setSchedules(items);
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

    return {
        schedules, total, loading, error,
        search, setSearch, page, setPage, pageSize: PAGE_SIZE,
        busyId, refresh, handleCreate, handleToggle, handleDelete, handleRunNow
    };
}
