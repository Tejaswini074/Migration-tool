import { Response } from "express";
import scheduleService, { HttpError } from "./schedule.service";
import { AuthenticatedRequest } from "../auth/auth.middleware";

const respondToError = (res: Response, err: any) => {
    if (err instanceof HttpError) {
        res.status(err.status).json({ success: false, message: err.message });
        return;
    }
    res.status(500).json({ success: false, message: err.message });
};

export const createSchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { projectId, cronExpression, mode, batchSize, source, destination } = req.body;

        if (!projectId || !cronExpression || !source || !destination) {
            res.status(400).json({
                success: false,
                message: "projectId, cronExpression, source and destination are required"
            });
            return;
        }

        const scheduleId = await scheduleService.createSchedule(
            { projectId: Number(projectId), cronExpression, mode: mode === "incremental" ? "incremental" : "full", batchSize, source, destination },
            { userId: req.user!.userId, role: req.user!.role, name: req.user!.name }
        );

        res.json({ success: true, scheduleId });
    } catch (err: any) {
        respondToError(res, err);
    }
};

export const listSchedules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const schedules = await scheduleService.listSchedules({
            userId: req.user!.userId, role: req.user!.role, name: req.user!.name
        });
        res.json({ success: true, schedules });
    } catch (err: any) {
        respondToError(res, err);
    }
};

export const toggleSchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.scheduleId);
        const { isActive } = req.body;

        await scheduleService.toggleSchedule(id, Boolean(isActive), {
            userId: req.user!.userId, role: req.user!.role, name: req.user!.name
        });
        res.json({ success: true });
    } catch (err: any) {
        respondToError(res, err);
    }
};

export const deleteSchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.scheduleId);

        await scheduleService.deleteSchedule(id, {
            userId: req.user!.userId, role: req.user!.role, name: req.user!.name
        });
        res.json({ success: true });
    } catch (err: any) {
        respondToError(res, err);
    }
};

export const runScheduleNow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.scheduleId);

        await scheduleService.runScheduleNow(id, {
            userId: req.user!.userId, role: req.user!.role, name: req.user!.name
        });
        res.json({ success: true, message: "Run triggered" });
    } catch (err: any) {
        respondToError(res, err);
    }
};
