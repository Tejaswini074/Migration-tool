import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getAppDatabase } from "../config/appDatabase";
import { AppUser, AuthTokenPayload, UserRole } from "./auth.types";

export type PublicUser = { id: number; name: string; email: string; role: UserRole };

type AuthResult =
    | { ok: true; token: string; user: PublicUser }
    | { ok: false; status: number; message: string };

type SimpleResult =
    | { ok: true }
    | { ok: false; status: number; message: string };

class AuthService {

    private async ensureTables() {
        const db = getAppDatabase();
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    async countUsers(): Promise<number> {
        await this.ensureTables();
        const db = getAppDatabase();
        const [rows]: any = await db.query("SELECT COUNT(*) total FROM users");
        return rows[0].total;
    }

    async findByEmail(email: string): Promise<AppUser | null> {
        await this.ensureTables();
        const db = getAppDatabase();
        const [rows]: any = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        return rows[0] ?? null;
    }

    async findById(id: number): Promise<AppUser | null> {
        await this.ensureTables();
        const db = getAppDatabase();
        const [rows]: any = await db.query("SELECT * FROM users WHERE id = ?", [id]);
        return rows[0] ?? null;
    }

    async listUsers(): Promise<Omit<AppUser, "password_hash">[]> {
        await this.ensureTables();
        const db = getAppDatabase();
        const [rows]: any = await db.query(
            "SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC"
        );
        return rows;
    }

    async createUser(data: { name: string; email: string; password: string; role: UserRole }): Promise<number> {
        await this.ensureTables();
        const db = getAppDatabase();

        const existing = await this.findByEmail(data.email);
        if (existing) {
            throw new Error("A user with this email already exists");
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        const [result]: any = await db.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [data.name, data.email, passwordHash, data.role]
        );

        return result.insertId;
    }

    async verifyPassword(user: AppUser, password: string): Promise<boolean> {
        return bcrypt.compare(password, user.password_hash);
    }

    issueToken(payload: AuthTokenPayload): string {
        return jwt.sign(payload, process.env.JWT_SECRET as string, {
            expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as jwt.SignOptions["expiresIn"]
        });
    }

    toPublicUser(user: { id: number; name: string; email: string; role: UserRole | string }): PublicUser {
        return { id: user.id, name: user.name, email: user.email, role: user.role as UserRole };
    }

    /** The very first account ever created on an instance - always becomes admin, and only works once. */
    async registerFirstAdmin(data: { name: string; email: string; password: string }): Promise<AuthResult> {
        const total = await this.countUsers();
        if (total > 0) {
            return { ok: false, status: 403, message: "Registration is closed. Ask an admin to create your account." };
        }

        const role: UserRole = "admin";
        const userId = await this.createUser({ ...data, role });
        const user = { id: userId, name: data.name, email: data.email, role };

        return { ok: true, token: this.issueToken({ userId, name: data.name, email: data.email, role }), user };
    }

    /** Open self-registration for everyone after the instance has been bootstrapped - always role "user". */
    async signupUser(data: { name: string; email: string; password: string }): Promise<AuthResult> {
        const role: UserRole = "user";
        const userId = await this.createUser({ ...data, role });
        const user = { id: userId, name: data.name, email: data.email, role };

        return { ok: true, token: this.issueToken({ userId, name: data.name, email: data.email, role }), user };
    }

    async authenticate(email: string, password: string): Promise<AuthResult> {
        const user = await this.findByEmail(email);
        const valid = user ? await this.verifyPassword(user, password) : false;

        // Deliberately identical message for "no such user" and "wrong password" so the
        // response doesn't leak which part of the credential pair was wrong.
        if (!user || !valid) {
            return { ok: false, status: 401, message: "Invalid email or password" };
        }

        const publicUser = this.toPublicUser(user);
        return {
            ok: true,
            token: this.issueToken({ userId: user.id, name: user.name, email: user.email, role: user.role }),
            user: publicUser
        };
    }

    async changeUserRole(userId: number, role: UserRole, requesterId: number): Promise<SimpleResult> {
        if (requesterId === userId && role !== "admin") {
            return { ok: false, status: 400, message: "You cannot demote your own account" };
        }

        await this.ensureTables();
        const db = getAppDatabase();
        await db.execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
        return { ok: true };
    }

    async removeUser(userId: number, requesterId: number): Promise<SimpleResult> {
        if (requesterId === userId) {
            return { ok: false, status: 400, message: "You cannot delete your own account" };
        }

        await this.ensureTables();
        const db = getAppDatabase();
        await db.execute("DELETE FROM users WHERE id = ?", [userId]);
        return { ok: true };
    }

}

export default new AuthService();
