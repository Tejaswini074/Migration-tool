import { Response } from "express";
import authService from "./auth.service";
import { AuthenticatedRequest } from "./auth.middleware";

export const getBootstrapStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const total = await authService.countUsers();
        res.json({
            success: true,
            needsBootstrap: total === 0,
            openSignupEnabled: process.env.ALLOW_OPEN_SIGNUP === "true"
        });
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

/**
 * Open self-registration is opt-in (ALLOW_OPEN_SIGNUP=true) - closed by default so an instance
 * pointed at a real database doesn't let anyone on the internet create an account for
 * themselves. Bootstrap (the very first admin, via `register`) is unaffected by this gate.
 */
export const signup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (process.env.ALLOW_OPEN_SIGNUP !== "true") {
            res.status(403).json({
                success: false,
                message: "Self-service signup is disabled on this instance. Ask an admin to create your account."
            });
            return;
        }

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

export const forgotPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: "Email is required" });
            return;
        }

        await authService.requestPasswordReset(email);
        // Always the same response, whether or not the email matched an account.
        res.json({ success: true, message: "If that email has an account, a reset link has been sent." });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({ success: false, message: "Token and new password are required" });
            return;
        }

        const result = await authService.resetPassword(token, newPassword);
        if (!result.ok) {
            res.status(result.status).json({ success: false, message: result.message });
            return;
        }

        res.json({ success: true });

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

export const changeOwnPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, message: "Current password and new password are required" });
            return;
        }

        const result = await authService.changePassword(req.user!.userId, currentPassword, newPassword);
        if (!result.ok) {
            res.status(result.status).json({ success: false, message: result.message });
            return;
        }

        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const adminResetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = Number(req.params.userId);
        const { newPassword } = req.body;

        if (!newPassword) {
            res.status(400).json({ success: false, message: "New password is required" });
            return;
        }

        const result = await authService.adminResetPassword(userId, newPassword);
        if (!result.ok) {
            res.status(result.status).json({ success: false, message: result.message });
            return;
        }

        res.json({ success: true });

    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const listUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { search, page, pageSize } = req.query;
        const { items, total } = await authService.listUsers({
            search: search ? String(search) : undefined,
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined
        });
        res.json({ success: true, users: items, total });
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
