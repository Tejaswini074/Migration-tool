import bcrypt from "bcryptjs";
import { getAppDatabase } from "../config/appDatabase";
import { AppUser, UserRole } from "./auth.types";

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

    async updateRole(userId: number, role: UserRole) {
        await this.ensureTables();
        const db = getAppDatabase();
        await db.execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    }

    async deleteUser(userId: number) {
        await this.ensureTables();
        const db = getAppDatabase();
        await db.execute("DELETE FROM users WHERE id = ?", [userId]);
    }

    async verifyPassword(user: AppUser, password: string): Promise<boolean> {
        return bcrypt.compare(password, user.password_hash);
    }

}

export default new AuthService();
