import { Response } from "express";
import authService from "./auth.service";
import { AuthenticatedRequest } from "./auth.middleware";

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

        const result = await authService.registerFirstAdmin({ name, email, password });
        if (!result.ok) {
            res.status(result.status).json({ success: false, message: result.message });
            return;
        }

        res.json({ success: true, token: result.token, user: result.user });

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

        const result = await authService.signupUser({ name, email, password });
        if (!result.ok) {
            res.status(result.status).json({ success: false, message: result.message });
            return;
        }

        res.json({ success: true, token: result.token, user: result.user });

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

        const result = await authService.authenticate(email, password);
        if (!result.ok) {
            res.status(result.status).json({ success: false, message: result.message });
            return;
        }

        res.json({ success: true, token: result.token, user: result.user });

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

        res.json({ success: true, user: authService.toPublicUser(user) });

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

        const result = await authService.changeUserRole(userId, role, req.user!.userId);
        if (!result.ok) {
            res.status(result.status).json({ success: false, message: result.message });
            return;
        }

        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = Number(req.params.userId);

        const result = await authService.removeUser(userId, req.user!.userId);
        if (!result.ok) {
            res.status(result.status).json({ success: false, message: result.message });
            return;
        }

        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
