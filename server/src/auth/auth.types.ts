export type UserRole = "admin" | "user";

export interface AppUser {
    id: number;
    name: string;
    email: string;
    password_hash: string;
    role: UserRole;
    created_at: string;
}

export interface AuthTokenPayload {
    userId: number;
    name: string;
    email: string;
    role: UserRole;
}
