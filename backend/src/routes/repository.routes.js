const express = require("express");

const {
    listResources,
    getResource,
    createResource,
    updateResource,
    deleteResource
} = require("../controllers/repository.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", listResources);
router.get("/:id", getResource);
router.post("/", authenticate, authorizeRoles("contributor", "admin"), createResource);
router.put("/:id", authenticate, authorizeRoles("contributor", "admin"), updateResource);
router.delete("/:id", authenticate, authorizeRoles("contributor", "admin"), deleteResource);

module.exports = router;
