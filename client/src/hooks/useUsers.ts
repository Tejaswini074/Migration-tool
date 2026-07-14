import { useEffect, useState } from "react";
import { adminResetPassword, createUser, deleteUser, listUsers, updateUserRole } from "../services/authApi";
import { extractErrorMessage } from "../services/client";
import type { ManagedUser, UserRole } from "../types";

const PAGE_SIZE = 10;

export function useUsers() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearchState] = useState("");
    const [page, setPage] = useState(1);
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
            const { items, total: itemTotal } = await listUsers({
                search: search || undefined,
                page,
                pageSize: PAGE_SIZE
            });
            setUsers(items);
            setTotal(itemTotal);
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search]);

    const setSearch = (value: string) => {
        setSearchState(value);
        setPage(1);
    };

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

    const handleResetPassword = async (userId: number, newPassword: string) => {
        setError(null);
        try {
            await adminResetPassword(userId, newPassword);
            return true;
        } catch (err) {
            setError(extractErrorMessage(err));
            return false;
        }
    };

    return {
        users,
        total,
        search,
        setSearch,
        page,
        setPage,
        pageSize: PAGE_SIZE,
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
        handleDelete,
        handleResetPassword
    };
}
