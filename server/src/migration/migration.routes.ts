import { Router } from "express";
import { runMigration, getMigrationStatus } from "./migration.controller";

const router = Router();

router.post("/run", runMigration);

router.get("/status/:runId", getMigrationStatus);

export default router;
