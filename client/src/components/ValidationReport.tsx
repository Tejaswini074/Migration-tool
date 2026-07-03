import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { useValidation } from "../hooks/useValidation";
import type { ConnectionState } from "../types";
import Card from "./ui/Card";
import Button from "./ui/Button";

interface Props {
    projectId: number;
    source: ConnectionState;
    destination: ConnectionState;
    onBack: () => void;
    onContinue: () => void;
}

export default function ValidationReport({ projectId, source, destination, onBack, onContinue }: Props) {
    const { result, loading, error, refresh } = useValidation(projectId, source, destination);
    const [acknowledged, setAcknowledged] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500 dark:text-indigo-400" />
                Running pre-flight checks against your data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Button variant="secondary" onClick={refresh} className="w-fit">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                </Button>
            </div>
        );
    }

    if (!result) return null;

    const hasErrors = result.errorCount > 0;
    const hasWarnings = result.warningCount > 0;
    const clean = !hasErrors && !hasWarnings;
    const canContinue = !hasErrors || acknowledged;

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={
                                clean
                                    ? "flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-emerald-500/10"
                                    : hasErrors
                                        ? "flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10"
                                        : "flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10"
                            }
                        >
                            {clean ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-emerald-400" />
                            ) : hasErrors ? (
                                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {clean
                                    ? "All checks passed"
                                    : `${result.errorCount} error(s), ${result.warningCount} warning(s) found`}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Checked required fields, uniqueness, and foreign-key dependencies before migrating.
                            </p>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={refresh}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-check
                    </Button>
                </div>
            </Card>

            {result.tables
                .filter((t) => t.issues.length > 0)
                .map((t) => (
                    <Card key={t.tableMappingId}>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {t.sourceTable} <span className="text-slate-400 dark:text-slate-500">&rarr;</span> {t.destinationTable}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {t.issues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    {issue.severity === "error" ? (
                                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
                                    ) : (
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                                    )}
                                    <span className="text-slate-600 dark:text-slate-400">{issue.message}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}

            {hasErrors && (
                <label className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                    />
                    I understand the errors above may cause rows to fail during migration, and want to proceed anyway.
                </label>
            )}

            <div className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>
                    Back to mapping
                </Button>
                <Button disabled={!canContinue} onClick={onContinue}>
                    {clean ? "Continue to Migrate" : hasErrors ? "Proceed anyway" : "Continue to Migrate"}
                </Button>
            </div>
        </div>
    );
}
