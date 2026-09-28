const express = require("express");

const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const { handleImageUpload, uploadMedia } = require("../controllers/media.controller");
const {
    getDraft,
    editDraft,
    publishDraft,
    getPublishingStatus
} = require("../controllers/bluesky.controller");

const router = express.Router();
router.use(authenticate, authorizeRoles("admin"));
router.get("/draft", getDraft);
router.put("/draft", editDraft);
router.post("/media", handleImageUpload, uploadMedia);
router.post("/publish", publishDraft);
router.get("/status", getPublishingStatus);

module.exports = router;
