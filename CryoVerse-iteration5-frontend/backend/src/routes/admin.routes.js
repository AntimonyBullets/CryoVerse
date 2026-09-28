const express = require("express");

const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const {
    listUsers,
    changeRole,
    listSubmissions,
    moderateResource,
    publishResource,
    unpublishResource,
    getAuditHistory
} = require("../controllers/admin.controller");

const router = express.Router();
router.use(authenticate, authorizeRoles("admin"));
router.get("/users", listUsers);
router.patch("/users/:id/role", changeRole);
router.get("/submissions", listSubmissions);
router.post("/resources/:id/moderate", moderateResource);
router.post("/resources/:id/publish", publishResource);
router.post("/resources/:id/unpublish", unpublishResource);
router.get("/audit", getAuditHistory);

module.exports = router;
