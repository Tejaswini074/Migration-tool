import { useEffect, useState } from "react";
import { createUser, deleteUser, listUsers, updateUserRole } from "../services/authApi";
import { extractErrorMessage } from "../services/client";
import type { ManagedUser, UserRole } from "../types";

export function useUsers() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("user");
    const [creating, setCreating] = useState(false);

    const refresh = async () => {
        setLoading(true);
        try {
            setUsers(await listUsers());
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreate = async () => {
        setCreating(true);
        setError(null);
        try {
            await createUser({ name, email, password, role });
            setName("");
            setEmail("");
            setPassword("");
            setRole("user");
            await refresh();
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setCreating(false);
        }
    };

    const handleRoleChange = async (userId: number, newRole: UserRole) => {
        setError(null);
        try {
            await updateUserRole(userId, newRole);
            await refresh();
        } catch (err) {
            setError(extractErrorMessage(err));
        }
    };

    const handleDelete = async (userId: number) => {
        setError(null);
        try {
            await deleteUser(userId);
            await refresh();
        } catch (err) {
            setError(extractErrorMessage(err));
        }
    };

    return {
        users,
        loading,
        error,
        name,
        setName,
        email,
        setEmail,
        password,
        setPassword,
        role,
        setRole,
        creating,
        handleCreate,
        handleRoleChange,
        handleDelete
    };
}
