import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getAppDatabase } from "../config/appDatabase";
import { AppUser, AuthTokenPayload, UserRole } from "./auth.types";
import { sendPasswordResetEmail } from "../lib/mailer";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const hashResetToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

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
        await db.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token_hash VARCHAR(64) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token_hash (token_hash)
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

    async listUsers(
        options?: { search?: string; page?: number; pageSize?: number }
    ): Promise<{ items: Omit<AppUser, "password_hash">[]; total: number }> {
        await this.ensureTables();
        const db = getAppDatabase();

        const conditions: string[] = [];
        const params: any[] = [];

        if (options?.search) {
            conditions.push("(name LIKE ? OR email LIKE ?)");
            params.push(`%${options.search}%`, `%${options.search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const [countRows]: any = await db.query(`SELECT COUNT(*) total FROM users ${whereClause}`, params);
        const total = countRows[0].total;

        let sql = `SELECT id, name, email, role, created_at FROM users ${whereClause} ORDER BY created_at ASC`;
        const queryParams = [...params];
        if (options?.page && options?.pageSize) {
            sql += ` LIMIT ? OFFSET ?`;
            queryParams.push(options.pageSize, (options.page - 1) * options.pageSize);
        }

        const [rows]: any = await db.query(sql, queryParams);
        return { items: rows, total };
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

    async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<SimpleResult> {
        if (newPassword.length < 8) {
            return { ok: false, status: 400, message: "New password must be at least 8 characters" };
        }

        const user = await this.findById(userId);
        if (!user) {
            return { ok: false, status: 404, message: "User not found" };
        }

        const valid = await this.verifyPassword(user, currentPassword);
        if (!valid) {
            return { ok: false, status: 400, message: "Current password is incorrect" };
        }

        const db = getAppDatabase();
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
        return { ok: true };
    }

    /**
     * Always resolves `{ ok: true }` whether or not the email matches an account - the caller
     * must not be able to tell the two cases apart, or this becomes a way to enumerate which
     * emails have accounts. If a match is found, a single-use token is generated, its hash
     * (never the raw token) is stored, and the raw token is emailed (or logged, if SMTP isn't
     * configured - see mailer.ts) as a link the client turns into a reset-password call.
     */
    async requestPasswordReset(email: string): Promise<{ ok: true }> {
        await this.ensureTables();
        const user = await this.findByEmail(email);

        if (user) {
            const db = getAppDatabase();
            const token = crypto.randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

            await db.execute(
                "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
                [user.id, hashResetToken(token), expiresAt]
            );

            const appUrl = process.env.APP_URL || "http://localhost:5173";
            const resetUrl = `${appUrl}/reset-password?token=${token}`;

            try {
                await sendPasswordResetEmail(user.email, resetUrl);
            } catch (err) {
                console.error("Failed to send password reset email:", err);
            }
        }

        return { ok: true };
    }

    async resetPassword(token: string, newPassword: string): Promise<SimpleResult> {
        if (newPassword.length < 8) {
            return { ok: false, status: 400, message: "New password must be at least 8 characters" };
        }

        await this.ensureTables();
        const db = getAppDatabase();
        const tokenHash = hashResetToken(token);

        const [rows]: any = await db.query(
            `SELECT id, user_id FROM password_reset_tokens
             WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
            [tokenHash]
        );
        const record = rows[0];
        if (!record) {
            return { ok: false, status: 400, message: "This reset link is invalid or has expired" };
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, record.user_id]);
        await db.execute("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [record.id]);

        return { ok: true };
    }

    /** Admin sets a new password directly - same trust level as createUser already setting one. */
    async adminResetPassword(userId: number, newPassword: string): Promise<SimpleResult> {
        if (newPassword.length < 8) {
            return { ok: false, status: 400, message: "New password must be at least 8 characters" };
        }

        await this.ensureTables();
        const db = getAppDatabase();
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
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
