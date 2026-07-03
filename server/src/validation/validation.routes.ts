import { Router } from "express";
import { validateProject } from "./validation.controller";

const router = Router();

router.post("/project", validateProject);

export default router;
