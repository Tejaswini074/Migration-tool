import { Response } from "express";
import connectionManager from "../database/connectionManager";
import recommendationService from "./reommendation.service";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export const recommendTables = async (req: AuthenticatedRequest, res: Response) => {

    try {
        const { sourceConnectionId, destinationConnectionId } = req.body;
        const isAdmin = req.user!.role === "admin";
        const source = connectionManager.getOwned(sourceConnectionId, req.user!.userId, isAdmin);
        const destination = connectionManager.getOwned(destinationConnectionId, req.user!.userId, isAdmin);

        if (!source || !destination) {
            return res.status(404).json({
                success: false,
                message: "Connection Not Found"
            });
        }

        const recommendation = await recommendationService.compareSchemas(source, destination);

        res.json({
            success: true,
            recommendation
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
