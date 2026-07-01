import { useState, type ChangeEvent } from "react";
import { CheckCircle2, Server } from "lucide-react";
import { connectDatabase, getDatabaseSchema } from "../api/dataBridgeApi";
import { extractErrorMessage } from "../api/client";
import type { ConnectionState } from "../api/types";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Button from "./ui/Button";

interface Props {
    label: string;
    connection: ConnectionState | null;
    onConnected: (state: ConnectionState) => void;
}

const initialForm = { host: "localhost", port: "3306", user: "root", password: "", database: "" };

export default function ConnectionForm({ label, connection, onConnected }: Props) {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
    };

    const handleConnect = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await connectDatabase(form);
            const schema = await getDatabaseSchema(result.connectionId);
            onConnected({
                connectionId: result.connectionId,
                database: result.database,
                host: form.host,
                port: form.port,
                schema
            });
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (connection) {
        return (
            <Card>
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">{label}</p>
                        <p className="mt-0.5 text-sm text-slate-600">
                            <span className="font-medium">{connection.database}</span> @ {connection.host}:
                            {connection.port}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{connection.schema.length} table(s) found</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="mb-4 flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-900">{label}</p>
            </div>

            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                    <Input label="Host" value={form.host} onChange={handleChange("host")} />
                    <Input label="Port" value={form.port} onChange={handleChange("port")} />
                </div>
                <Input label="User" value={form.user} onChange={handleChange("user")} />
                <Input label="Password" type="password"
                    value={form.password} onChange={handleChange("password")}
                />
                <Input label="Database" value={form.database} onChange={handleChange("database")} />
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <Button loading={loading}
                disabled={!form.host || !form.database || !form.user}
                onClick={handleConnect}
                className="mt-4 w-full"
            >
                Connect
            </Button>
        </Card>
    );
}
