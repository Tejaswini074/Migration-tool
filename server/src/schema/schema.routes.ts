import { Router } from "express";

import { getTables, getColumns, getForeignKeys, getDatabaseSchema } from "./schema.controller";

const router = Router();

router.get("/tables/:connectionId", getTables);

router.get("/columns/:connectionId/:tableName", getColumns);

router.get("/foreignkeys/:connectionId/:tableName", getForeignKeys);

router.get("/schema/:connectionId", getDatabaseSchema);

export default router;