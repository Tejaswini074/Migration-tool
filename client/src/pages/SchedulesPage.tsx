import { useState } from "react";
import { CalendarClock, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useSchedules } from "../hooks/useSchedules";
import { useProjects } from "../hooks/useProjects";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import type { ScheduleConnectionConfig } from "../types";

const CRON_PRESETS: { label: string; value: string }[] = [
    { label: "Every hour", value: "0 * * * *" },
    { label: "Every day at 2am", value: "0 2 * * *" },
    { label: "Every Monday at 9am", value: "0 9 * * 1" },
    { label: "Custom", value: "" }
];

const emptyConfig: ScheduleConnectionConfig = { type: "mysql", host: "localhost", port: "3306", user: "root", password: "", database: "" };

const statusTone = (status: string | null) =>
    status === "completed" ? "green" : status === "failed" ? "red" : status === "completed_with_errors" ? "amber" : "slate";

function CredentialFields({ label, value, onChange }: {
    label: string;
    value: ScheduleConnectionConfig;
    onChange: (next: ScheduleConnectionConfig) => void;
}) {
    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
            <div className="inline-flex w-fit rounded-lg bg-slate-100 p-1 text-sm dark:bg-white/5">
                {(["mysql", "postgres"] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange({ ...value, type: t, port: t === "mysql" ? "3306" : "5432" })}
                        className={
                            value.type === t
                                ? "rounded-md bg-white px-3 py-1 font-medium text-slate-900 shadow-sm dark:bg-white/10 dark:text-white"
                                : "rounded-md px-3 py-1 font-medium text-slate-500 dark:text-slate-400"
                        }
                    >
                        {t === "mysql" ? "MySQL" : "PostgreSQL"}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Input label="Host" value={value.host} onChange={(e) => onChange({ ...value, host: e.target.value })} />
                <Input label="Port" value={value.port} onChange={(e) => onChange({ ...value, port: e.target.value })} />
            </div>
            <Input label="User" value={value.user} onChange={(e) => onChange({ ...value, user: e.target.value })} />
            <Input
                label="Password"
                type="password"
                value={value.password}
                onChange={(e) => onChange({ ...value, password: e.target.value })}
            />
            <Input label="Database" value={value.database} onChange={(e) => onChange({ ...value, database: e.target.value })} />
        </div>
    );
}

export default function SchedulesPage() {
    const { schedules, loading, error, busyId, handleCreate, handleToggle, handleDelete, handleRunNow } = useSchedules();
    const { projects } = useProjects();

    const [showForm, setShowForm] = useState(false);
    const [projectId, setProjectId] = useState("");
    const [preset, setPreset] = useState(CRON_PRESETS[1].value);
    const [cronExpression, setCronExpression] = useState(CRON_PRESETS[1].value);
    const [mode, setMode] = useState<"full" | "incremental">("full");
    const [batchSize, setBatchSize] = useState("500");
    const [source, setSource] = useState<ScheduleConnectionConfig>(emptyConfig);
    const [destination, setDestination] = useState<ScheduleConnectionConfig>(emptyConfig);
    const [creating, setCreating] = useState(false);

    const projectName = (id: number) => projects.find((p) => p.id === id)?.project_name ?? `Project #${id}`;

    const submit = async () => {
        setCreating(true);
        const ok = await handleCreate({
            projectId: Number(projectId),
            cronExpression,
            mode,
            batchSize: Number(batchSize) || undefined,
            source,
            destination
        });
        setCreating(false);
        if (ok) {
            setShowForm(false);
            setSource(emptyConfig);
            setDestination(emptyConfig);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Card className="p-0">
                <div className="flex items-center justify-between px-6 pt-6">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Schedules ({schedules.length})</h3>
                    <Button size="sm" onClick={() => setShowForm((v) => !v)}>
                        <Plus className="h-3.5 w-3.5" />
                        New schedule
                    </Button>
                </div>

                {loading ? (
                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
                ) : schedules.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                            <CalendarClock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No schedules yet</p>
                        <p className="-mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Create one to run a project automatically on a recurring basis.
                        </p>
                    </div>
                ) : (
                    <table className="mt-4 w-full text-sm">
                        <thead className="border-t border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                            <tr>
                                <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Project</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cron</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mode</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Last run</th>
                                <th className="px-6 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {schedules.map((s) => (
                                <tr key={s.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{projectName(s.project_id)}</td>
                                    <td className="px-6 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{s.cron_expression}</td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400 capitalize">{s.mode}</td>
                                    <td className="px-6 py-3">
                                        {s.last_run_status ? (
                                            <Badge tone={statusTone(s.last_run_status)}>{s.last_run_status}</Badge>
                                        ) : (
                                            <span className="text-xs text-slate-400 dark:text-slate-500">Never run</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                loading={busyId === s.id}
                                                onClick={() => handleRunNow(s.id)}
                                            >
                                                Run now
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                loading={busyId === s.id}
                                                onClick={() => handleToggle(s.id, !s.is_active)}
                                            >
                                                {s.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                                {s.is_active ? "Pause" : "Resume"}
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                loading={busyId === s.id}
                                                onClick={() => handleDelete(s.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="h-6" />
            </Card>

            {showForm && (
                <Card>
                    <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">New schedule</h3>
                    <div className="flex flex-col gap-4">
                        <Select label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                            <option value="">-- Select a project --</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.project_name}</option>
                            ))}
                        </Select>

                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                label="Frequency"
                                value={preset}
                                onChange={(e) => {
                                    setPreset(e.target.value);
                                    if (e.target.value) setCronExpression(e.target.value);
                                }}
                            >
                                {CRON_PRESETS.map((p) => (
                                    <option key={p.label} value={p.value}>{p.label}</option>
                                ))}
                            </Select>
                            <Input
                                label="Cron expression"
                                value={cronExpression}
                                onChange={(e) => setCronExpression(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value as "full" | "incremental")}>
                                <option value="full">Full sync</option>
                                <option value="incremental">Incremental sync</option>
                            </Select>
                            <Input
                                label="Batch size"
                                type="number"
                                min={50}
                                max={5000}
                                step={50}
                                value={batchSize}
                                onChange={(e) => setBatchSize(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <CredentialFields label="Source database" value={source} onChange={setSource} />
                            <CredentialFields label="Destination database" value={destination} onChange={setDestination} />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                            <Button
                                loading={creating}
                                disabled={!projectId || !cronExpression || !source.database || !destination.database}
                                onClick={submit}
                            >
                                Create schedule
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
