import { Download } from "lucide-react";
import { useMigrationHistory } from "../hooks/useMigrationHistory";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

const statusTone = (status: string) =>
    status === "completed" ? "green" : status === "failed" ? "red" : "blue";

export default function MigrationHistoryPage() {
    const { runs, loading, error, downloadingKey, downloadReport } = useMigrationHistory();

    return (
        <div className="flex flex-col gap-5">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Card className="p-0">
                {loading ? (
                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
                ) : runs.length === 0 ? (
                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">No migration runs found yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Project</th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Started by</th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Started at</th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                                <th className="px-6 py-3 text-right font-medium text-slate-500 dark:text-slate-400">Report</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {runs.map((run) => (
                                <tr key={run.run_id}>
                                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">
                                        {run.project_name}
                                        <div className="text-xs text-slate-400 dark:text-slate-500">
                                            {run.source_database} &rarr; {run.destination_database}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                        {run.started_by_name}
                                        <div className="text-xs text-slate-400 dark:text-slate-500">{run.started_by_email}</div>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                        {new Date(run.started_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3">
                                        <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                                    </td>
                                    <td className="px-6 py-3">
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
            </Card>
        </div>
    );
}
