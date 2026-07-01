import { useEffect, useState, type FormEvent } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { createUser, deleteUser, listUsers, updateUserRole } from "../api/authApi";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { ManagedUser, UserRole } from "../api/types";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Button from "./ui/Button";
import Badge from "./ui/Badge";

export default function AdminUsersPage() {
    const { user: currentUser } = useAuth();
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

    useEffect(() => { refresh(); }, []);

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
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

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <div className="mb-4 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">Add user</h3>
                </div>
                <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={handleCreate}>
                    <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </Select>
                    <Button type="submit" loading={creating} disabled={!name || !email || !password}>
                        Create user
                    </Button>
                </form>
            </Card>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Card className="p-0">
                <h3 className="px-6 pt-6 text-sm font-semibold text-slate-900">Users</h3>
                {loading ? (
                    <p className="px-6 py-6 text-sm text-slate-500">Loading...</p>
                ) : (
                    <table className="mt-4 w-full text-sm">
                        <thead className="border-t border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-6 py-2 text-left font-medium text-slate-500">Name</th>
                                <th className="px-6 py-2 text-left font-medium text-slate-500">Email</th>
                                <th className="px-6 py-2 text-left font-medium text-slate-500">Role</th>
                                <th className="px-6 py-2 text-left font-medium text-slate-500">Created</th>
                                <th className="px-6 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td className="px-6 py-3 text-slate-700">{u.name}</td>
                                    <td className="px-6 py-3 text-slate-500">{u.email}</td>
                                    <td className="px-6 py-3">
                                        {u.id === currentUser?.id ? (
                                            <Badge tone={u.role === "admin" ? "blue" : "slate"}>{u.role}</Badge>
                                        ) : (
                                            <Select
                                                value={u.role}
                                                onChange={(e) =>
                                                    handleRoleChange(u.id, e.target.value as UserRole)
                                                }
                                                className="w-28"
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </Select>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-slate-500">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button
                                            disabled={u.id === currentUser?.id}
                                            onClick={() => handleDelete(u.id)}
                                            title="Delete user"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="h-6" />
            </Card>
        </div>
    );
}
