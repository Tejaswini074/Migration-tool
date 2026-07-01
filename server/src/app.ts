import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import databaseRoutes from "./database/database.routes";
import schemaRoutes from "./schema/schema.routes";
import recommendationRoutes from "./recommendation/recommendation.routes";
import mappingRoutes from "./Mapping/mapping.routes";
import migrationRoutes from "./migration/migration.routes";
import authRoutes from "./auth/auth.routes";
import { authenticate } from "./auth/auth.middleware";
dotenv.config();

const app = express();

app.use(cors());
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
export default app;