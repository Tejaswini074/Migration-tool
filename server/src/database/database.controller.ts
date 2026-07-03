import { Response } from "express";
import { v4 as uuid } from "uuid";
import connectionManager from "./connectionManager";
import { createConnector } from "../connectors/connectorFactory";
import { ConnectorType } from "../connectors/types";
import { AuthenticatedRequest } from "../auth/auth.middleware";


export const connectDatabase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const { host, port, user, password, database, type } = req.body;
        if (!host || !port || !user || !database) {

            res.status(400).json({
                success: false,
                message: "Host, Port, Username and Database are required."
            });
            return;
        }

        const connector = createConnector({
            type: (type || "mysql") as ConnectorType,
            host, port, user, password, database
        });

        await connector.testConnection();

        const connectionId = uuid();
        connectionManager.add(connectionId, connector, req.user!.userId);

        res.status(200).json({
            success: true,
            connectionId,
            database,
            type: connector.type,
            message: "Database Connected Successfully"
        });

    } catch (error: any) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const disconnectDatabase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const connectionId = String(req.params.connectionId);
        const connector = connectionManager.getOwned(connectionId, req.user!.userId, req.user!.role === "admin");
        if (!connector) {

            res.status(404).json({
                success: false,
                message: "Connection Not Found"
            });
            return;
        }

        await connector.close();
        connectionManager.remove(connectionId);

        res.status(200).json({
            success: true,
            message: "Connection Closed Successfully"
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const getActiveConnections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {
        const activeConnections = connectionManager.getAllOwned(req.user!.userId, req.user!.role === "admin");

        res.status(200).json({
            success: true,
            totalConnections: activeConnections.length,
            connections: activeConnections
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
