const express = require("express");

const {
    listResources,
    listMyResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    submitResource,
    getResourceAudit
} = require("../controllers/repository.controller");
const { authenticate, optionalAuthenticate, authorizeRoles } = require("../middleware/auth.middleware");
const { uploadMedia, handleMediaUpload } = require("../controllers/media.controller");
const { generateResourceAIContent } = require("../controllers/ai-content.controller");

const router = express.Router();

router.get("/", listResources);
// Ownership, not role, decides who may list their own resources: an account
// that contributed resources must still see them after a role change.
router.get("/mine", authenticate, listMyResources);
router.post("/media", authenticate, authorizeRoles("contributor", "admin"), handleMediaUpload, uploadMedia);
router.post("/:id/ai-content", authenticate, authorizeRoles("contributor", "admin"), generateResourceAIContent);
router.post("/:id/submit", authenticate, authorizeRoles("contributor"), submitResource);
router.get("/:id/audit", authenticate, authorizeRoles("contributor", "admin"), getResourceAudit);
router.get("/:id", optionalAuthenticate, getResource);
router.post("/", authenticate, authorizeRoles("contributor", "admin"), createResource);
router.put("/:id", authenticate, authorizeRoles("contributor", "admin"), updateResource);
router.delete("/:id", authenticate, authorizeRoles("contributor", "admin"), deleteResource);

module.exports = router;
