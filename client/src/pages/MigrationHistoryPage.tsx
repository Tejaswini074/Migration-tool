import { useEffect, useState } from "react";
import { Download, History, Search } from "lucide-react";
import { useMigrationHistory } from "../hooks/useMigrationHistory";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import Pagination from "../components/ui/Pagination";
import { initials } from "../lib/initials";

const statusTone = (status: string) =>
    status === "completed" ? "green"
        : status === "failed" ? "red"
            : status === "completed_with_errors" ? "amber"
                : status === "cancelled" ? "slate" : "blue";

export default function MigrationHistoryPage() {
    const { runs, total, loading, error, search, setSearch, page, setPage, pageSize, downloadingKey, downloadReport } = useMigrationHistory();
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebouncedValue(searchInput);

    useEffect(() => {
        setSearch(debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    return (
        <div className="flex flex-col gap-5">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="max-w-xs">
                <Input
                    placeholder="Search by project..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    rightSlot={<Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                />
            </div>

            <Card className="p-0">
                {loading ? (
                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
                ) : runs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                            <History className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {search ? "No runs match your search" : "No migration runs yet"}
                        </p>
                        <p className="-mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {search ? "Try a different search term." : "Runs you start from the Migration tab will show up here."}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Started by</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Started at</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Report</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {runs.map((run) => (
                                <tr key={run.run_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                                    <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300">
                                        <p className="font-medium text-slate-800 dark:text-slate-200">{run.project_name}</p>
                                        <div className="text-xs text-slate-400 dark:text-slate-500">
                                            {run.source_database} &rarr; {run.destination_database}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                {initials(run.started_by_name)}
                                            </div>
                                            <div>
                                                {run.started_by_name}
                                                <div className="text-xs text-slate-400 dark:text-slate-500">{run.started_by_email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                                        {new Date(run.started_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                loading={downloadingKey === `${run.run_id}-csv`}
                                                disabled={run.status === "running"}
                                                onClick={() => downloadReport(run.run_id, "csv")}
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                CSV
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                loading={downloadingKey === `${run.run_id}-pdf`}
                                                disabled={run.status === "running"}
                                                onClick={() => downloadReport(run.run_id, "pdf")}
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                PDF
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </Card>
        </div>
    );
}
