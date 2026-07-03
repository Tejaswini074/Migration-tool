import { Router } from "express";
import { createSchedule, listSchedules, toggleSchedule, deleteSchedule, runScheduleNow } from "./schedule.controller";

const router = Router();

router.post("/", createSchedule);
router.get("/", listSchedules);
router.patch("/:scheduleId/toggle", toggleSchedule);
router.delete("/:scheduleId", deleteSchedule);
router.post("/:scheduleId/run-now", runScheduleNow);

export default router;
