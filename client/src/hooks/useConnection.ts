import { useState, type ChangeEvent } from "react";
import { connectDatabase, getDatabaseSchema } from "../services/dataBridgeApi";
import { extractErrorMessage } from "../services/client";
import type { ConnectionState } from "../types";

const initialForm = { host: "localhost", port: "3306", user: "root", password: "", database: "" };

export function useConnection(onConnected: (state: ConnectionState) => void) {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
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
                schema
            });
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return { form, handleChange, loading, error, connect };
}
