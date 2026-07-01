import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const TOKEN_STORAGE_KEY = "databridge_token";

export const apiClient = axios.create({ baseURL });

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);
export const setStoredToken = (token: string) => localStorage.setItem(TOKEN_STORAGE_KEY, token);
export const clearStoredToken = () => localStorage.removeItem(TOKEN_STORAGE_KEY);

apiClient.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
        return err.response?.data?.message || err.message;
    }
    return err instanceof Error ? err.message : "Something went wrong";
};
