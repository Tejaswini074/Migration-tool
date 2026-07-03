import { Request, Response } from "express";
import connectionManager from "../database/connectionManager";
import schemaService from "./schema.service";

export const getTables = async (req: Request, res: Response): Promise<void> => {

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

        const tables = await schemaService.getTables(connection);
        res.status(200).json({
            success: true,
            totalTables: tables.length,
            tables
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getColumns = async (req: Request, res: Response): Promise<void> => {

    try {

        const connectionId = String(req.params.connectionId);
        const tableName = String(req.params.tableName);
        const connection = connectionManager.get(connectionId);

        if (!connection) {

            res.status(404).json({
                success: false,
                message: "Connection Not Found"
            });
            return;
        }

        const columns = await schemaService.getColumns(connection, tableName);

        res.json({
            success: true,
            columns
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


export const getForeignKeys = async (req: Request, res: Response): Promise<void> => {

    try {
        const connectionId = String(req.params.connectionId);
        const tableName = String(req.params.tableName);
        const connection = connectionManager.get(connectionId);

        if (!connection) {
            res.status(404).json({
                success: false,
                message: "Connection Not Found"
            });
            return;
        }

        const foreignKeys = await schemaService.getForeignKeys(connection, tableName);

        res.json({
            success: true,
            foreignKeys
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getDatabaseSchema = async (req: Request, res: Response): Promise<void> => {
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

        const schema = await schemaService.getSchema(connection);

        res.json({
            success: true,
            schema
        });

    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};