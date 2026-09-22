const express = require("express");

const {
    listExpeditions,
    getExpedition,
    createExpedition,
    updateExpedition,
    deleteExpedition
} = require("../controllers/expedition.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", listExpeditions);
router.get("/:id", getExpedition);
router.post("/", authenticate, authorizeRoles("contributor", "admin"), createExpedition);
router.put("/:id", authenticate, authorizeRoles("contributor", "admin"), updateExpedition);
router.delete("/:id", authenticate, authorizeRoles("contributor", "admin"), deleteExpedition);

module.exports = router;
