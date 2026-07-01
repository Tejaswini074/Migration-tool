import { Router } from "express";
import {
    getBootstrapStatus,
    register,
    signup,
    login,
    me,
    listUsers,
    createUserByAdmin,
    updateUserRole,
    deleteUser
} from "./auth.controller";
import { authenticate, requireRole } from "./auth.middleware";

const router = Router();

router.get("/bootstrap-status", getBootstrapStatus);
router.post("/register", register);
router.post("/signup", signup);
router.post("/login", login);

router.get("/me", authenticate, me);

router.get("/users", authenticate, requireRole("admin"), listUsers);
router.post("/users", authenticate, requireRole("admin"), createUserByAdmin);
router.patch("/users/:userId/role", authenticate, requireRole("admin"), updateUserRole);
router.delete("/users/:userId", authenticate, requireRole("admin"), deleteUser);

export default router;
