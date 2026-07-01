import { useState, type FormEvent } from "react";
import { Database } from "lucide-react";
import { useAuth } from "./AuthContext";
import { extractErrorMessage } from "../api/client";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function AuthGate() {
    const { needsBootstrap, login, registerFirstAdmin } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (needsBootstrap) {
                await registerFirstAdmin(name, email, password);
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex flex-col items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                        <Database className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900">DataBridge</p>
                </div>

                <Card>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {needsBootstrap ? "Create the admin account" : "Sign in"}
                    </h2>
                    {needsBootstrap && (
                        <p className="mt-1 text-sm text-slate-500">
                            No users exist yet. The first account you create becomes the administrator.
                        </p>
                    )}

                    <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
                        {needsBootstrap && (
                            <Input
                                label="Full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        )}
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <Button
                            type="submit"
                            loading={loading}
                            disabled={!email || !password || (needsBootstrap && !name)}
                            className="mt-1 w-full"
                        >
                            {needsBootstrap ? "Create admin account" : "Sign in"}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
