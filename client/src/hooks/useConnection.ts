import { useState, type ChangeEvent } from "react";
import { connectDatabase, getDatabaseSchema } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { ConnectionState, ConnectorType } from "../types";

const defaultPort: Record<ConnectorType, string> = { mysql: "3306", postgres: "5432" };

const initialForm = { host: "localhost", port: defaultPort.mysql, user: "root", password: "", database: "", type: "mysql" as ConnectorType };

export function useConnection(onConnected: (state: ConnectionState) => void) {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
    };

    const setType = (type: ConnectorType) => {
        setForm((f) => ({ ...f, type, port: f.port === defaultPort[f.type] ? defaultPort[type] : f.port }));
    };

    const connect = async () => {
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
                type: result.type,
                schema
            });
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return { form, handleChange, setType, loading, error, connect };
}
