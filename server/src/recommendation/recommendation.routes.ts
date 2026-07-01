import { Router } from "express";

import { recommendTables } from "./recommendation.controller";

const router = Router();

router.post("/tables", recommendTables);

export default router;