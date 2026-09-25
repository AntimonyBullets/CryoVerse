const mongoose = require("mongoose");

const AIContent = require("../models/ai-content.model");
const ExpeditionAIContent = require("../models/expedition-ai-content.model");
const XPublication = require("../models/x-publication.model");
const { recordAudit } = require("../services/audit.service");
const { publishText } = require("../services/x.service");

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const getTarget = async (targetType, targetId) => {
    if (!["Resource", "Expedition"].includes(targetType) || !isId(targetId)) {
        return null;
    }
    const Model = targetType === "Resource" ? AIContent : ExpeditionAIContent;
    const content = await Model.findOne({
        [targetType === "Resource" ? "resourceId" : "expeditionId"]: targetId
    });
    return content && content.xPostDraft ? content : null;
};

const getDraft = async (req, res) => {
    const { targetType, targetId } = req.query;
    const content = await getTarget(targetType, targetId);
    if (!content) {
        return res.status(404).json({ success: false, message: "X post draft not found" });
    }
    const publication = await XPublication.findOne({ targetType, targetId });
    return res.status(200).json({
        success: true,
        draft: content.xPostDraft,
        publishing: publication || null
    });
};

const publishDraft = async (req, res) => {
    const { targetType, targetId } = req.body || {};
    if (!["Resource", "Expedition"].includes(targetType) || !isId(targetId)) {
        return res.status(400).json({ success: false, message: "Valid targetType and targetId are required" });
    }
    try {
        const content = await getTarget(targetType, targetId);
        if (!content) {
            return res.status(404).json({ success: false, message: "X post draft not found" });
        }
        let publication = await XPublication.findOne({ targetType, targetId });
        if (publication && publication.status === "published") {
            return res.status(409).json({ success: false, message: "This draft has already been published", publishing: publication });
        }
        if (!publication) {
            publication = await XPublication.create({ targetType, targetId, draft: content.xPostDraft });
        } else {
            publication.draft = content.xPostDraft;
            publication.error = null;
            await publication.save();
        }
        try {
            const result = await publishText(publication.draft);
            publication.status = "published";
            publication.xPostId = result.id;
            publication.publishedAt = new Date();
            publication.error = null;
            await publication.save();
            await recordAudit({
                actorId: req.user.userId,
                targetType: "XPost",
                targetId: publication._id,
                action: "x_post_published",
                details: { targetType, targetId, xPostId: result.id }
            });
            return res.status(200).json({ success: true, publishing: publication });
        } catch (error) {
            publication.status = "failed";
            publication.error = error.message;
            await publication.save();
            await recordAudit({
                actorId: req.user.userId,
                targetType: "XPost",
                targetId: publication._id,
                action: "x_post_failed",
                details: { targetType, targetId, error: error.message }
            });
            return res.status(error.statusCode || 502).json({
                success: false,
                message: error.message,
                publishing: publication
            });
        }
    } catch (error) {
        console.error("X draft publishing failed:", error.message);
        return res.status(error.statusCode || 502).json({ success: false, message: error.message });
    }
};

const getPublishingStatus = async (req, res) => {
    const { targetType, targetId } = req.query;
    if (!["Resource", "Expedition"].includes(targetType) || !isId(targetId)) {
        return res.status(400).json({ success: false, message: "Valid targetType and targetId are required" });
    }
    const publication = await XPublication.findOne({ targetType, targetId });
    if (!publication) {
        return res.status(404).json({ success: false, message: "X publishing status not found" });
    }
    return res.status(200).json({ success: true, publishing: publication });
};

module.exports = { getDraft, publishDraft, getPublishingStatus };
