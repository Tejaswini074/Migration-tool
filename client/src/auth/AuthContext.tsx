import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, login as loginApi, registerFirstAdmin as registerApi, getBootstrapStatus } from "../api/authApi";
import { clearStoredToken, setStoredToken, getStoredToken } from "../api/client";
import type { AuthUser } from "../api/types";

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    needsBootstrap: boolean;
    login: (email: string, password: string) => Promise<void>;
    registerFirstAdmin: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsBootstrap, setNeedsBootstrap] = useState(false);

    useEffect(() => {
        (async () => {
            const token = getStoredToken();
            if (token) {
                try {
                    const me = await getMe();
                    setUser(me);
                    setLoading(false);
                    return;
                } catch {
                    clearStoredToken();
                }
            }

            try {
                setNeedsBootstrap(await getBootstrapStatus());
            } catch {
                // ignore here - the login/bootstrap form will surface connection errors on submit
            }
            setLoading(false);
        })();
    }, []);

    const login = async (email: string, password: string) => {
        const result = await loginApi({ email, password });
        setStoredToken(result.token);
        setUser(result.user);
    };

    const registerFirstAdmin = async (name: string, email: string, password: string) => {
        const result = await registerApi({ name, email, password });
        setStoredToken(result.token);
        setUser(result.user);
        setNeedsBootstrap(false);
    };

    const logout = () => {
        clearStoredToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, needsBootstrap, login, registerFirstAdmin, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
