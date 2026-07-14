import { Router } from "express";
import { connectCsv, connectDatabase, disconnectDatabase, getActiveConnections } from "./database.controller";
import { csvUpload } from "./csvUpload";

const router = Router();

router.post("/connect", connectDatabase);
router.post("/connect-csv", csvUpload.single("file"), connectCsv);
router.delete("/disconnect/:connectionId", disconnectDatabase);
router.get("/connections", getActiveConnections);

export default router;