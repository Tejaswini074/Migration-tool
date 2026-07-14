import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
    getMe,
    login as loginApi,
    registerFirstAdmin as registerApi,
    signup as signupApi,
    getBootstrapStatus
} from "../services/authApi";
import { clearStoredToken, setStoredToken, getStoredToken } from "../services/client";
import type { AuthUser } from "../types";

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    needsBootstrap: boolean;
    openSignupEnabled: boolean;
    login: (email: string, password: string) => Promise<void>;
    registerFirstAdmin: (name: string, email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsBootstrap, setNeedsBootstrap] = useState(false);
    const [openSignupEnabled, setOpenSignupEnabled] = useState(false);

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
                const status = await getBootstrapStatus();
                setNeedsBootstrap(status.needsBootstrap);
                setOpenSignupEnabled(status.openSignupEnabled);
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

    const signup = async (name: string, email: string, password: string) => {
        const result = await signupApi({ name, email, password });
        setStoredToken(result.token);
        setUser(result.user);
    };

    const logout = () => {
        clearStoredToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, needsBootstrap, openSignupEnabled, login, registerFirstAdmin, signup, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
