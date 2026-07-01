import { apiClient } from "./client";
import type { AuthUser, ManagedUser, UserRole } from "../types";

export const getBootstrapStatus = async () => {
    const { data } = await apiClient.get<{ success: boolean; needsBootstrap: boolean }>(
        "/auth/bootstrap-status"
    );
    return data.needsBootstrap;
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

export const listUsers = async () => {
    const { data } = await apiClient.get<{ success: boolean; users: ManagedUser[] }>("/auth/users");
    return data.users;
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
