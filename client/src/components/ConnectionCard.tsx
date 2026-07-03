import { CheckCircle2, Server } from "lucide-react";
import { useConnection } from "../hooks/useConnection";
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
