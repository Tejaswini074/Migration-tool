import { Request, Response } from "express";
import mysql from "mysql2/promise";
import { v4 as uuid } from "uuid";
import connectionManager from "./connectionManager";


export const connectDatabase = async (req: Request, res: Response): Promise<void> => {

    try {
        const { host, port, user, password, database } = req.body;
        if (!host || !port || !user || !database) {

            res.status(400).json({
                success: false,
                message: "Host, Port, Username and Database are required."
            });
            return;
        }
        const pool = mysql.createPool({
            host, port, user, password, database,
            waitForConnections: true,
            connectionLimit: 10
        });

        await pool.query("SELECT 1");
        const connectionId = uuid();
        connectionManager.add(connectionId, pool);

        res.status(200).json({
            success: true,
            connectionId,
            database,
            message: "Database Connected Successfully"
        });

    } catch (error: any) {

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const disconnectDatabase = async (req: Request, res: Response): Promise<void> => {

    try {
        const connectionId = String(req.params.connectionId);
        const connection = connectionManager.get(connectionId);
        if (!connection) {

            res.status(404).json({
                success: false,
                message: "Connection Not Found"
            });
            return;
        }

        await connection.end();
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


export const getActiveConnections = async (req: Request, res: Response): Promise<void> => {

    try {
        const activeConnections: any[] = [];
        connectionManager.getAll().forEach((_, connectionId) => {
            activeConnections.push({ connectionId });
        });

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