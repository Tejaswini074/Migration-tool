import { Router } from "express";
import {
    runMigration,
    getMigrationStatus,
    getMigrationHistory,
    downloadReport
} from "./migration.controller";

const router = Router();

router.post("/run", runMigration);

router.get("/status/:runId", getMigrationStatus);

router.get("/history/:connectionId", getMigrationHistory);

router.get("/report/:connectionId/:runId", downloadReport);

export default router;
