import { Response } from "express";
import jwt from "jsonwebtoken";
import authService from "./auth.service";
import { AuthTokenPayload, UserRole } from "./auth.types";
import { AuthenticatedRequest } from "./auth.middleware";

const signToken = (payload: AuthTokenPayload) =>
    jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as jwt.SignOptions["expiresIn"]
    });

export const getBootstrapStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const total = await authService.countUsers();
        res.json({ success: true, needsBootstrap: total === 0 });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: "Name, email and password are required" });
            return;
        }

        const total = await authService.countUsers();
        if (total > 0) {
            res.status(403).json({
                success: false,
                message: "Registration is closed. Ask an admin to create your account."
            });
            return;
        }

        const role: UserRole = "admin";
        const userId = await authService.createUser({ name, email, password, role });
        const token = signToken({ userId, name, email, role });

        res.json({ success: true, token, user: { id: userId, name, email, role } });

    } catch (err: any) {
        res.status(400).json({ success: false, message: err.message });
    }
};


export const signup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    

    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: "Name, email and password are required" });
            return;
        }
        const userId = await authService.createUser({ name, email, password, role: "user" });
        const token = signToken({ userId, name, email, role: "user" });
        res.json({ success: true, token, user: { id: userId, name, email, role: "user" } });
    } catch (err: any) {
        res.status(400).json({ success: false, message: err.message });
    }

};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: "Email and password are required" });
            return;
        }

        const user = await authService.findByEmail(email);
        if (!user) {
            res.status(401).json({ success: false, message: "Invalid email or password" });
            return;
        }

        const valid = await authService.verifyPassword(user, password);
        if (!valid) {
            res.status(401).json({ success: false, message: "Invalid email or password" });
            return;
        }

        const token = signToken({
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole
        });

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = await authService.findById(req.user!.userId);

        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        res.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const listUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const users = await authService.listUsers();
        res.json({ success: true, users });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createUserByAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: "Name, email and password are required" });
            return;
        }

        const userId = await authService.createUser({
            name,
            email,
            password,
            role: role === "admin" ? "admin" : "user"
        });

        res.json({ success: true, userId });

    } catch (err: any) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = Number(req.params.userId);
        const { role } = req.body;

        if (role !== "admin" && role !== "user") {
            res.status(400).json({ success: false, message: "Role must be 'admin' or 'user'" });
            return;
        }

        if (req.user!.userId === userId && role !== "admin") {
            res.status(400).json({ success: false, message: "You cannot demote your own account" });
            return;
        }

        await authService.updateRole(userId, role);
        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = Number(req.params.userId);

        if (req.user!.userId === userId) {
            res.status(400).json({ success: false, message: "You cannot delete your own account" });
            return;
        }

        await authService.deleteUser(userId);
        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
