import { useState } from "react";
import { ArrowLeft, ArrowRight, Database, FolderKanban, Play } from "lucide-react";
import { useProjectDetail, useProjects } from "../hooks/useProjects";
import ConnectionCard from "../components/ConnectionCard";
import ValidationReport from "../components/ValidationReport";
import MigrationProgress from "../components/MigrationProgress";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { initials } from "../lib/initials";
import type { ConnectionState } from "../types";

export default function ProjectsPage() {
    const [openProjectId, setOpenProjectId] = useState<number | null>(null);

    if (openProjectId) {
        return <ProjectDetailView projectId={openProjectId} onBack={() => setOpenProjectId(null)} />;
    }

    return <ProjectList onOpen={setOpenProjectId} />;
}

function ProjectList({ onOpen }: { onOpen: (id: number) => void }) {
    const { projects, loading, error } = useProjects();

    return (
        <div className="flex flex-col gap-5">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Card className="p-0">
                {loading ? (
                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                            <FolderKanban className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No migration projects yet</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Create one from the Migration tab and it will show up here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Created by</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Created at</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {projects.map((p) => (
                                <tr
                                    key={p.id}
                                    onClick={() => onOpen(p.id)}
                                    className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                                >
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                                                <Database className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{p.project_name}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                                    {p.source_database} &rarr; {p.destination_database}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                {initials(p.created_by_name)}
                                            </div>
                                            {p.created_by_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                                        {new Date(p.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-transform group-hover:translate-x-0.5 dark:text-indigo-400">
                                            Open
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </span>
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

const tableStatusTone = (status: string) =>
    status === "Completed" ? "green"
        : status === "Failed" ? "red"
            : status === "Completed With Errors" ? "amber"
                : status === "Running" ? "blue" : "slate";

function ProjectDetailView({ projectId, onBack }: { projectId: number; onBack: () => void }) {
    const { project, loading, error } = useProjectDetail(projectId);
    const [source, setSource] = useState<ConnectionState | null>(null);
    const [destination, setDestination] = useState<ConnectionState | null>(null);
    const [validated, setValidated] = useState(false);
    const bothConnected = Boolean(source && destination);

    return (
        <div className="flex flex-col gap-5">
            <button
                onClick={onBack}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to projects
            </button>

            {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading project...</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {project && (
                <>
                    <Card>
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                                <Database className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{project.project_name}</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {project.source_database} <span className="text-slate-400 dark:text-slate-500">&rarr;</span>{" "}
                                    {project.destination_database}
                                </p>
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                    Created {new Date(project.created_at).toLocaleString()} by {project.created_by_name}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-0">
                        <h4 className="px-6 pt-6 text-sm font-semibold text-slate-900 dark:text-white">
                            Table mapping ({project.tables.length})
                        </h4>
                        <table className="mt-4 w-full text-sm">
                            <thead className="border-t border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                                <tr>
                                    <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Source table</th>
                                    <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Destination table</th>
                                    <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Columns</th>
                                    <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Last status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {project.tables.map((t) => (
                                    <tr key={t.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{t.source_table}</td>
                                        <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{t.destination_table}</td>
                                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{t.columns.length} mapped</td>
                                        <td className="px-6 py-3">
                                            <Badge tone={tableStatusTone(t.status)}>{t.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="h-6" />
                    </Card>

                    {!bothConnected && (
                        <>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Play className="h-4 w-4" />
                                Reconnect both databases to run this migration again.
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <ConnectionCard label="Source database" connection={source} onConnected={setSource} />
                                <ConnectionCard
                                    label="Destination database"
                                    connection={destination}
                                    onConnected={setDestination}
                                />
                            </div>
                        </>
                    )}

                    {bothConnected && !validated && (
                        <ValidationReport
                            projectId={project.id}
                            source={source!}
                            destination={destination!}
                            onBack={() => {
                                setSource(null);
                                setDestination(null);
                            }}
                            onContinue={() => setValidated(true)}
                        />
                    )}

                    {bothConnected && validated && (
                        <MigrationProgress projectId={project.id} source={source!} destination={destination!} />
                    )}
                </>
            )}
        </div>
    );
}
