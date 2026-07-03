import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import databaseRoutes from "./database/database.routes";
import schemaRoutes from "./schema/schema.routes";
import recommendationRoutes from "./recommendation/recommendation.routes";
import mappingRoutes from "./Mapping/mapping.routes";
import migrationRoutes from "./migration/migration.routes";
import validationRoutes from "./validation/validation.routes";
import notificationRoutes from "./notifications/notification.routes";
import scheduleRoutes from "./schedule/schedule.routes";
import authRoutes from "./auth/auth.routes";
import { authenticate } from "./auth/auth.middleware";
dotenv.config();

const app = express();

// CORS_ORIGIN unset -> reflect the request origin (convenient for local dev). Set it to a
// comma-separated allowlist in production so the API only serves the app's real frontend(s).
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);

// contentSecurityPolicy is meant for pages a browser renders, not a pure JSON API - leave it
// off. crossOriginResourcePolicy must allow cross-origin or the frontend (a different origin/
// port in dev, likely a different domain in prod) gets its own fetch responses blocked.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("DataBridge Backend Running...");
});

app.use("/api/auth", authRoutes);

app.use("/api/database", authenticate, databaseRoutes);
app.use("/api/schema", authenticate, schemaRoutes);
app.use("/api/recommendation", authenticate, recommendationRoutes);
app.use("/api/mapping", authenticate, mappingRoutes);
app.use("/api/migration", authenticate, migrationRoutes);
app.use("/api/validation", authenticate, validationRoutes);
app.use("/api/notifications", authenticate, notificationRoutes);
app.use("/api/schedules", authenticate, scheduleRoutes);

// Every route above responds itself (including its own try/catch) - if a request falls
// through to here, no route matched.
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Not Found" });
});

// Last-resort safety net: malformed JSON bodies (express.json() throws before any route
// handler runs), and anything a handler forwards via next(err) or an async handler throws
// without its own try/catch (Express 5 auto-forwards those here). Without this, Express's
// default HTML error page would break every client that expects a JSON response.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled error:", err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message || "Internal server error" });
});

export default app;