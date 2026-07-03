import { Router } from "express";

import { createProject, getProjects, getProjectDetail, saveTableMapping, saveColumnMapping, previewMapping, setHighWaterColumn } from "./mapping.controller";

const router = Router();

router.post("/project", createProject);
router.get("/projects", getProjects);
router.get("/project/:projectId", getProjectDetail);
router.post("/table", saveTableMapping);
router.post("/column", saveColumnMapping);
router.post("/preview", previewMapping);
router.post("/table/:tableMappingId/high-water-column", setHighWaterColumn);

export default router;
