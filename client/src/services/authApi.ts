import { apiClient } from "./client";
import type { AuthUser, ManagedUser, PagedParams, UserRole } from "../types";

export const getBootstrapStatus = async () => {
    const { data } = await apiClient.get<{ success: boolean; needsBootstrap: boolean; openSignupEnabled: boolean }>(
        "/auth/bootstrap-status"
    );
    return { needsBootstrap: data.needsBootstrap, openSignupEnabled: data.openSignupEnabled };
};

export const registerFirstAdmin = async (payload: { name: string; email: string; password: string }) => {
    const { data } = await apiClient.post<{ success: boolean; token: string; user: AuthUser }>(
        "/auth/register",
        payload
    );
    return data;
};

export const signup = async (payload: { name: string; email: string; password: string }) => {
    const { data } = await apiClient.post<{ success: boolean; token: string; user: AuthUser }>(
        "/auth/signup",
        payload
    );
    return data;
};

export const login = async (payload: { email: string; password: string }) => {
    const { data } = await apiClient.post<{ success: boolean; token: string; user: AuthUser }>(
        "/auth/login",
        payload
    );
    return data;
};

export const getMe = async () => {
    const { data } = await apiClient.get<{ success: boolean; user: AuthUser }>("/auth/me");
    return data.user;
};

export const changeOwnPassword = async (currentPassword: string, newPassword: string) => {
    await apiClient.put("/auth/me/password", { currentPassword, newPassword });
};

export const forgotPassword = async (email: string) => {
    await apiClient.post("/auth/forgot-password", { email });
};

export const resetPassword = async (token: string, newPassword: string) => {
    await apiClient.post("/auth/reset-password", { token, newPassword });
};

export const adminResetPassword = async (userId: number, newPassword: string) => {
    await apiClient.put(`/auth/users/${userId}/password`, { newPassword });
};

export const listUsers = async (params: PagedParams = {}) => {
    const { data } = await apiClient.get<{ success: boolean; users: ManagedUser[]; total: number }>(
        "/auth/users",
        { params }
    );
    return { items: data.users, total: data.total };
};

export const createUser = async (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}) => {
    const { data } = await apiClient.post<{ success: boolean; userId: number }>("/auth/users", payload);
    return data.userId;
};

export const updateUserRole = async (userId: number, role: UserRole) => {
    await apiClient.patch(`/auth/users/${userId}/role`, { role });
};

export const deleteUser = async (userId: number) => {
    await apiClient.delete(`/auth/users/${userId}`);
};
