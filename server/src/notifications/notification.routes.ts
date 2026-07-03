import { Router } from "express";
import { getNotificationSettings, updateNotificationSettings } from "./notification.controller";

const router = Router();

router.get("/settings", getNotificationSettings);
router.put("/settings", updateNotificationSettings);

export default router;
