import multer from "multer";
import { Request } from "express";
import { AuthenticatedRequest } from "../auth/auth.middleware";

export type AuthenticatedFileRequest = AuthenticatedRequest & { file?: Express.Multer.File };

const MAX_CSV_SIZE_BYTES = 20 * 1024 * 1024;

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
        cb(new Error("Only .csv files are accepted"));
        return;
    }
    cb(null, true);
};

/** In-memory storage - CSV rows are parsed once and held by CsvConnector, nothing is written to disk. */
export const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_CSV_SIZE_BYTES },
    fileFilter
});
