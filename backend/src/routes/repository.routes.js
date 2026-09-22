const express = require("express");

const {
    listResources,
    listMyResources,
    getResource,
    createResource,
    updateResource,
    deleteResource
} = require("../controllers/repository.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const { uploadMedia, handleMediaUpload } = require("../controllers/media.controller");

const router = express.Router();

router.get("/", listResources);
router.get("/mine", authenticate, authorizeRoles("contributor"), listMyResources);
router.post("/media", authenticate, authorizeRoles("contributor", "admin"), handleMediaUpload, uploadMedia);
router.get("/:id", getResource);
router.post("/", authenticate, authorizeRoles("contributor", "admin"), createResource);
router.put("/:id", authenticate, authorizeRoles("contributor", "admin"), updateResource);
router.delete("/:id", authenticate, authorizeRoles("contributor", "admin"), deleteResource);

module.exports = router;
