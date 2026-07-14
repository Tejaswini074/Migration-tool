import { Fragment, useEffect, useState } from "react";
import { KeyRound, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useUsers } from "../hooks/useUsers";
import { useAuth } from "../hooks/useAuth";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { UserRole } from "../types";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Pagination from "../components/ui/Pagination";
import { initials } from "../lib/initials";

export default function AdminUsersPage() {
    const { user: currentUser } = useAuth();
    const {
        users,
        total,
        search,
        setSearch,
        page,
        setPage,
        pageSize,
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
    } = useUsers();
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebouncedValue(searchInput);

    useEffect(() => {
        setSearch(debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                        <UserPlus className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add user</h3>
                </div>
                <form
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleCreate();
                    }}
                >
                    <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input type="email" placeholder="Email"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input type="password" placeholder="Password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
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

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="max-w-xs">
                <Input
                    placeholder="Search users..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    rightSlot={<Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                />
            </div>

            <Card className="p-0">
                <div className="flex items-center gap-2 px-6 pt-6">
                    <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Users ({total})</h3>
                </div>
                {loading ? (
                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                            <Users className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {search ? "No users match your search" : "No users yet"}
                        </p>
                        <p className="-mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {search ? "Try a different search term." : "Users created above will show up here."}
                        </p>
                    </div>
                ) : (
                    <table className="mt-4 w-full text-sm">
                        <thead className="border-t border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                            <tr>
                                <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Name</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Email</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Role</th>
                                <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Created</th>
                                <th className="px-6 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {users.map((u) => (
                                <Fragment key={u.id}>
                                    <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                    {initials(u.name)}
                                                </div>
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                                        <td className="px-6 py-3">
                                            {u.id === currentUser?.id ? (
                                                <Badge tone={u.role === "admin" ? "blue" : "slate"}>{u.role}</Badge>
                                            ) : (
                                                <Select value={u.role}
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
                                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setResettingUserId(resettingUserId === u.id ? null : u.id)}
                                                    title="Reset password"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                                                >
                                                    <KeyRound className="h-4 w-4" />
                                                </button>
                                                <button
                                                    disabled={u.id === currentUser?.id}
                                                    onClick={() => handleDelete(u.id)}
                                                    title="Delete user"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {resettingUserId === u.id && (
                                        <tr className="bg-slate-50 dark:bg-white/2">
                                            <td colSpan={5} className="px-6 py-3">
                                                <ResetPasswordInline
                                                    onCancel={() => setResettingUserId(null)}
                                                    onConfirm={async (newPassword) => {
                                                        const ok = await handleResetPassword(u.id, newPassword);
                                                        if (ok) setResettingUserId(null);
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </Card>
        </div>
    );
}

function ResetPasswordInline({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (newPassword: string) => void }) {
    const [newPassword, setNewPassword] = useState("");

    return (
        <div className="flex items-end gap-3">
            <div className="max-w-56 flex-1">
                <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
            </div>
            <Button
                size="sm"
                disabled={newPassword.length < 8}
                onClick={() => onConfirm(newPassword)}
            >
                Confirm
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancel}>
                Cancel
            </Button>
        </div>
    );
}
