import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthTokenPayload, UserRole } from "./auth.types";

export interface AuthenticatedRequest extends Request {
    user?: AuthTokenPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {

    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ success: false, message: "Missing or invalid authorization header" });
        return;
    }

    const token = header.slice("Bearer ".length);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthTokenPayload;
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

export const requireRole = (role: UserRole) => (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
        res.status(403).json({ success: false, message: "Insufficient permissions" });
        return;
    }
    next();
};
