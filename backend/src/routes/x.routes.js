const express = require("express");

const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const {
    getDraft,
    publishDraft,
    getPublishingStatus
} = require("../controllers/x.controller");

const router = express.Router();
router.use(authenticate, authorizeRoles("admin"));
router.get("/draft", getDraft);
router.post("/publish", publishDraft);
router.get("/status", getPublishingStatus);

module.exports = router;
