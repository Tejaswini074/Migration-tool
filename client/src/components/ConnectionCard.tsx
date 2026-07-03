import { useState } from "react";
import { CheckCircle2, ChevronRight, KeyRound, Server } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { cn } from "../lib/cn";
import type { ConnectionState } from "../types";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Button from "./ui/Button";

interface Props {
    label: string;
    connection: ConnectionState | null;
    onConnected: (state: ConnectionState) => void;
}

export default function ConnectionCard({ label, connection, onConnected }: Props) {
    const { form, handleChange, loading, error, connect } = useConnection(onConnected);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggleTable = (tableName: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(tableName)) next.delete(tableName);
            else next.add(tableName);
            return next;
        });
    };

    if (connection) {
        return (
            <Card>
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-emerald-500/10">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-medium">{connection.database}</span> @ {connection.host}:
                            {connection.port}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{connection.schema.length} table(s) found</p>
                    </div>
                </div>

                <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-white/10">
                    {connection.schema.map((table) => {
                        const isOpen = expanded.has(table.tableName);
                        return (
                            <div key={table.tableName} className="border-b border-slate-100 last:border-b-0 dark:border-white/5">
                                <button
                                    type="button"
                                    onClick={() => toggleTable(table.tableName)}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                                >
                                    <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                                        <ChevronRight
                                            className={cn(
                                                "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform dark:text-slate-500",
                                                isOpen && "rotate-90"
                                            )}
                                        />
                                        {table.tableName}
                                    </span>
                                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                                        {table.columns.length} cols &middot; {table.totalRows} rows
                                    </span>
                                </button>

                                {isOpen && (
                                    <div className="bg-slate-50 px-3 py-1.5 dark:bg-white/2">
                                        {table.columns.map((col) => (
                                            <div
                                                key={col.Field}
                                                className="flex items-center justify-between gap-3 py-1 pl-5 text-xs"
                                            >
                                                <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    {col.Key === "PRI" && (
                                                        <KeyRound className="h-3 w-3 shrink-0 text-amber-500 dark:text-amber-400" />
                                                    )}
                                                    <span className="truncate">{col.Field}</span>
                                                </span>
                                                <span className="shrink-0 text-slate-400 dark:text-slate-500">
                                                    {col.Type}
                                                    {col.Null === "NO" && " · required"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="mb-4 flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
            </div>

            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                    <Input label="Host" value={form.host} onChange={handleChange("host")} />
                    <Input label="Port" value={form.port} onChange={handleChange("port")} />
                </div>
                <Input label="User" value={form.user} onChange={handleChange("user")} />
                <Input
                    label="Password"
                    type="password"
                    value={form.password}
                    onChange={handleChange("password")}
                />
                <Input label="Database" value={form.database} onChange={handleChange("database")} />
            </div>

            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button
                loading={loading}
                disabled={!form.host || !form.database || !form.user}
                onClick={connect}
                className="mt-4 w-full"
            >
                Connect
            </Button>
        </Card>
    );
}
