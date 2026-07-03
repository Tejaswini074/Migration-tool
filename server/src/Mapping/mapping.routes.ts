import { Router } from "express";

import { createProject, getProjects, getProjectDetail, saveTableMapping, saveColumnMapping } from "./mapping.controller";

const router = Router();

router.post("/project", createProject);
router.get("/projects", getProjects);
router.get("/project/:projectId", getProjectDetail);
router.post("/table", saveTableMapping);
router.post("/column", saveColumnMapping);

export default router;
