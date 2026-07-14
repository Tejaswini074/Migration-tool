import { ArrowRight, Database, FolderKanban, History as HistoryIcon, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMigrationStats } from "../hooks/useMigrationStats";
import type { View } from "../components/Sidebar";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

interface Props {
    onNavigate: (view: View) => void;
}

const statusTone = (status: string) =>
    status === "completed" ? "green"
        : status === "failed" ? "red"
            : status === "completed_with_errors" ? "amber"
                : status === "cancelled" ? "slate" : "blue";

const statCards = [
    { key: "totalProjects" as const, label: "Projects", icon: FolderKanban },
    { key: "totalRuns" as const, label: "Migration runs", icon: HistoryIcon },
    { key: "successRate" as const, label: "Success rate", icon: TrendingUp, suffix: "%" },
    { key: "totalRowsMigrated" as const, label: "Rows migrated", icon: Database }
];

export default function OverviewPage({ onNavigate }: Props) {
    const { stats, loading, error } = useMigrationStats();

    if (loading) {
        return <p className="text-sm text-slate-500 dark:text-slate-400">Loading overview...</p>;
    }

    if (error) {
        return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
    }

    if (!stats) return null;

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map((card) => (
                    <Card key={card.key}>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <card.icon className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                            {stats[card.key].toLocaleString()}
                            {card.suffix ?? ""}
                        </p>
                    </Card>
                ))}
            </div>

            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Rows migrated, last 14 days</h3>
                    <Button size="sm" onClick={() => onNavigate("wizard")}>
                        New migration
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.dailyRowsMigrated}>
                            <XAxis
                                dataKey="date"
                                tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                stroke="currentColor"
                                className="text-slate-400 dark:text-slate-500"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis stroke="currentColor" className="text-slate-400 dark:text-slate-500" fontSize={11} tickLine={false} axisLine={false} width={40} />
                            <Tooltip
                                contentStyle={{ background: "#1e1e2e", border: "none", borderRadius: 8, fontSize: 12 }}
                                labelStyle={{ color: "#94a3b8" }}
                            />
                            <Line type="monotone" dataKey="rows" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="p-0">
                <h3 className="px-6 pt-6 text-sm font-semibold text-slate-900 dark:text-white">Recent activity</h3>
                {stats.recentRuns.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        No migration runs yet. Start one from the Migration tab.
                    </p>
                ) : (
                    <div className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
                        {stats.recentRuns.map((run) => (
                            <div key={run.run_id} className="flex items-center justify-between px-6 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{run.project_name}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        {run.source_database} &rarr; {run.destination_database} &middot;{" "}
                                        {new Date(run.started_at).toLocaleString()}
                                    </p>
                                </div>
                                <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                            </div>
                        ))}
                    </div>
                )}
                <div className="h-6" />
            </Card>
        </div>
    );
}
