const express = require("express");

const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const {
    getArticle,
    getPublishedArticle,
    editArticle,
    publishArticle,
    unpublishArticle
} = require("../controllers/article.controller");

const router = express.Router();
router.get("/:targetType/:id", getPublishedArticle);
router.get("/admin/:targetType/:id", authenticate, authorizeRoles("admin"), getArticle);
router.put("/admin/:targetType/:id", authenticate, authorizeRoles("admin"), editArticle);
router.post("/admin/:targetType/:id/publish", authenticate, authorizeRoles("admin"), publishArticle);
router.post("/admin/:targetType/:id/unpublish", authenticate, authorizeRoles("admin"), unpublishArticle);

module.exports = router;
