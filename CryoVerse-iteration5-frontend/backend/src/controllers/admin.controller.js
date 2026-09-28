const mongoose = require("mongoose");

const User = require("../models/user.model");
const Resource = require("../models/resource.model");
const AIContent = require("../models/ai-content.model");
const Audit = require("../models/audit.model");
const { recordAudit } = require("../services/audit.service");

const safeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});

const parsePagination = (query) => {
    const page = Math.max(1, Math.min(10000, Number.parseInt(query.page, 10) || 1));
    const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 20));
    return { page, limit };
};

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

const listUsers = async (req, res) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const filter = {};
        if (req.query.role && ["user", "contributor", "admin"].includes(req.query.role)) {
            filter.role = req.query.role;
        }
        if (req.query.search) {
            const expression = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ name: expression }, { email: expression }];
        }
        const [users, total] = await Promise.all([
            User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            User.countDocuments(filter)
        ]);
        return res.status(200).json({ success: true, users: users.map(safeUser), pagination: { page, limit, total } });
    } catch (error) {
        console.error("Listing users failed:", error.message);
        return res.status(500).json({ success: false, message: "Unable to list users" });
    }
};

const changeRole = async (req, res) => {
    if (!isId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    const { role } = req.body || {};
    if (!["user", "contributor", "admin"].includes(role)) {
        return res.status(400).json({ success: false, message: "A valid role is required" });
    }
    if (req.params.id === req.user.userId) {
        return res.status(403).json({ success: false, message: "You cannot change your own role" });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.role === role) {
            return res.status(200).json({ success: true, user: safeUser(user) });
        }
        if (user.role === "admin" && role !== "admin") {
            const activeAdmins = await User.countDocuments({ role: "admin" });
            if (activeAdmins <= 1) {
                return res.status(400).json({ success: false, message: "The last active admin cannot be removed" });
            }
        }
        const fromRole = user.role;
        user.role = role;
        await user.save();
        await recordAudit({
            actorId: req.user.userId,
            targetType: "User",
            targetId: user._id,
            action: "role_changed",
            details: { fromRole, toRole: role }
        });
        return res.status(200).json({ success: true, user: safeUser(user) });
    } catch (error) {
        console.error("Changing user role failed:", error.message);
        return res.status(500).json({ success: false, message: "Unable to change user role" });
    }
};

const listSubmissions = async (req, res) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const filter = {};
        if (["submitted", "approved", "rejected", "published"].includes(req.query.status)) {
            filter.status = req.query.status;
        } else {
            filter.status = "submitted";
        }
        if (req.query.expeditionId) {
            if (!isId(req.query.expeditionId)) {
                return res.status(400).json({ success: false, message: "Invalid expedition ID" });
            }
            filter.expeditionId = req.query.expeditionId;
        }
        const [resources, total] = await Promise.all([
            Resource.find(filter)
                .populate("contributorId", "name email role")
                .populate("expeditionId", "name year location region")
                .sort({ submittedAt: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Resource.countDocuments(filter)
        ]);
        const aiContent = await AIContent.find({ resourceId: { $in: resources.map((resource) => resource._id) } });
        const contentByResource = new Map(aiContent.map((content) => [content.resourceId.toString(), content]));
        return res.status(200).json({
            success: true,
            resources: resources.map((resource) => ({
                resource,
                aiContent: contentByResource.get(resource._id.toString()) || null
            })),
            pagination: { page, limit, total }
        });
    } catch (error) {
        console.error("Listing submissions failed:", error.message);
        return res.status(500).json({ success: false, message: "Unable to list submissions" });
    }
};

const moderateResource = async (req, res) => {
    if (!isId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid resource ID" });
    }
    const { action, feedback = null } = req.body || {};
    if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ success: false, message: "Action must be approve or reject" });
    }
    if (action === "reject" && (!feedback || typeof feedback !== "string" || !feedback.trim())) {
        return res.status(400).json({ success: false, message: "Feedback is required when rejecting a resource" });
    }
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }
        if (resource.status !== "submitted") {
            return res.status(400).json({ success: false, message: "Only submitted resources can be reviewed" });
        }
        const toStatus = action === "approve" ? "approved" : "rejected";
        const fromStatus = resource.status;
        resource.status = toStatus;
        resource.reviewReason = action === "reject" ? feedback.trim() : null;
        resource.reviewedBy = req.user.userId;
        resource.reviewedAt = new Date();
        await resource.save();
        await recordAudit({
            actorId: req.user.userId,
            targetType: "Resource",
            targetId: resource._id,
            action: action === "approve" ? "resource_approved" : "resource_rejected",
            fromStatus,
            toStatus,
            feedback: resource.reviewReason
        });
        return res.status(200).json({ success: true, resource });
    } catch (error) {
        console.error("Moderating resource failed:", error.message);
        return res.status(500).json({ success: false, message: "Unable to moderate resource" });
    }
};

const publishResource = async (req, res) => {
    if (!isId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid resource ID" });
    }
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }
        if (resource.status !== "approved") {
            return res.status(400).json({ success: false, message: "Only approved resources can be published" });
        }
        const article = await AIContent.findOne({ resourceId: resource._id });
        if (!article || !article.websiteArticleDraft) {
            return res.status(400).json({ success: false, message: "A generated website article is required before publication" });
        }
        const fromStatus = resource.status;
        resource.status = "published";
        resource.publishedAt = new Date();
        await resource.save();
        await recordAudit({
            actorId: req.user.userId,
            targetType: "Resource",
            targetId: resource._id,
            action: "resource_published",
            fromStatus,
            toStatus: "published"
        });
        return res.status(200).json({ success: true, resource, aiContent: article });
    } catch (error) {
        console.error("Publishing resource failed:", error.message);
        return res.status(500).json({ success: false, message: "Unable to publish resource" });
    }
};

const unpublishResource = async (req, res) => {
    if (!isId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid resource ID" });
    }
    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }
        if (resource.status !== "published") {
            return res.status(400).json({ success: false, message: "Only published resources can be unpublished" });
        }
        resource.status = "approved";
        resource.publishedAt = null;
        await resource.save();
        await recordAudit({
            actorId: req.user.userId,
            targetType: "Resource",
            targetId: resource._id,
            action: "resource_unpublished",
            fromStatus: "published",
            toStatus: "approved"
        });
        return res.status(200).json({ success: true, resource });
    } catch (error) {
        console.error("Unpublishing resource failed:", error.message);
        return res.status(500).json({ success: false, message: "Unable to unpublish resource" });
    }
};

const getAuditHistory = async (req, res) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const filter = {};
        if (req.query.targetType && ["User", "Resource", "Expedition", "XPost"].includes(req.query.targetType)) {
            filter.targetType = req.query.targetType;
        }
        if (req.query.targetId) {
            if (!isId(req.query.targetId)) {
                return res.status(400).json({ success: false, message: "Invalid target ID" });
            }
            filter.targetId = req.query.targetId;
        }
        const [entries, total] = await Promise.all([
            Audit.find(filter).populate("actorId", "name email role").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            Audit.countDocuments(filter)
        ]);
        return res.status(200).json({ success: true, history: entries, pagination: { page, limit, total } });
    } catch (error) {
        console.error("Listing audit history failed:", error.message);
        return res.status(500).json({ success: false, message: "Unable to list audit history" });
    }
};

module.exports = {
    listUsers,
    changeRole,
    listSubmissions,
    moderateResource,
    publishResource,
    unpublishResource,
    getAuditHistory
};
