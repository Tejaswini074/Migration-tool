import { Router } from "express";
import { runMigration, getMigrationStatus, getMigrationStats, getMigrationHistory, getFailedRows, downloadReport } from "./migration.controller";

const router = Router();

router.post("/run", runMigration);
router.get("/status/:runId", getMigrationStatus);
router.get("/stats", getMigrationStats);
router.get("/history", getMigrationHistory);
router.get("/failed-rows/:runId", getFailedRows);
router.get("/report/:runId", downloadReport);

export default router;
