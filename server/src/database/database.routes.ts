import { Router } from "express";
import { connectDatabase, disconnectDatabase, getActiveConnections } from "./database.controller";

const router = Router();

router.post("/connect", connectDatabase);
router.delete("/disconnect/:connectionId", disconnectDatabase);
router.get("/connections", getActiveConnections);

export default router;