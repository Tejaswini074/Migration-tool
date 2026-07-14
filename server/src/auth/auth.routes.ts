import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
    getBootstrapStatus,
    register,
    signup,
    login,
    me,
    changeOwnPassword,
    forgotPassword,
    resetPassword,
    adminResetPassword,
    listUsers,
    createUserByAdmin,
    updateUserRole,
    deleteUser
} from "./auth.controller";
import { authenticate, requireRole } from "./auth.middleware";

const router = Router();

// Slows down credential-guessing/brute-force attempts against login and account creation.
const authAttemptLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please try again later." }
});

router.get("/bootstrap-status", getBootstrapStatus);
router.post("/register", authAttemptLimiter, register);
router.post("/signup", authAttemptLimiter, signup);
router.post("/login", authAttemptLimiter, login);
router.post("/forgot-password", authAttemptLimiter, forgotPassword);
router.post("/reset-password", authAttemptLimiter, resetPassword);

router.get("/me", authenticate, me);
router.put("/me/password", authenticate, authAttemptLimiter, changeOwnPassword);

router.get("/users", authenticate, requireRole("admin"), listUsers);
router.post("/users", authenticate, requireRole("admin"), createUserByAdmin);
router.patch("/users/:userId/role", authenticate, requireRole("admin"), updateUserRole);
router.put("/users/:userId/password", authenticate, requireRole("admin"), authAttemptLimiter, adminResetPassword);
router.delete("/users/:userId", authenticate, requireRole("admin"), deleteUser);

export default router;
