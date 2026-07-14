import { Response } from "express";
import notificationService from "./notification.service";
import { validateWebhookUrl } from "../lib/validateWebhookUrl";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export const getNotificationSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const settings = await notificationService.getSettings(req.user!.userId);
        res.json({ success: true, settings });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateNotificationSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { webhookUrl, notifyOnSuccess, notifyOnFailure } = req.body;

        if (webhookUrl) {
            const validation = await validateWebhookUrl(webhookUrl);
            if (!validation.ok) {
                res.status(400).json({ success: false, message: validation.message });
                return;
            }
        }

        await notificationService.updateSettings(req.user!.userId, {
            webhookUrl: webhookUrl || null,
            notifyOnSuccess: notifyOnSuccess !== false,
            notifyOnFailure: notifyOnFailure !== false
        });

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
