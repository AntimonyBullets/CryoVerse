const mongoose = require("mongoose");

const AIContent = require("../models/ai-content.model");
const ExpeditionAIContent = require("../models/expedition-ai-content.model");
const XPublication = require("../models/x-publication.model");
const { recordAudit } = require("../services/audit.service");
const { publishText, uploadImage } = require("../services/x.service");

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
        draft: publication ? publication.draft : content.xPostDraft,
        publishing: publication || null
    });
};

const validateMedia = (media) => {
    if (media === undefined) {
        return [];
    }
    if (!Array.isArray(media) || media.length > 4) {
        throw Object.assign(new Error("media must be an array with at most four images"), { statusCode: 400 });
    }
    return media.map((item) => {
        if (!item || typeof item.url !== "string") {
            throw Object.assign(new Error("Each media item requires a URL"), { statusCode: 400 });
        }
        let url;
        try {
            url = new URL(item.url);
        } catch (error) {
            throw Object.assign(new Error("Each media URL must be valid"), { statusCode: 400 });
        }
        if (
            !["http:", "https:"].includes(url.protocol)
            || !url.hostname.endsWith(".cloudinary.com")
            || !url.pathname.includes("/image/upload/")
            || !/\.(jpg|jpeg|png|gif)$/i.test(url.pathname)
        ) {
            throw Object.assign(new Error("Only Cloudinary image URLs are supported for X posts"), { statusCode: 400 });
        }
        return {
            url: item.url,
            publicId: typeof item.publicId === "string" ? item.publicId : null,
            resourceType: "image"
        };
    });
};

const editDraft = async (req, res) => {
    const { targetType, targetId, draft, media } = req.body || {};
    if (!["Resource", "Expedition"].includes(targetType) || !isId(targetId)) {
        return res.status(400).json({ success: false, message: "Valid targetType and targetId are required" });
    }
    if (typeof draft !== "string" || !draft.trim() || draft.trim().length > 280) {
        return res.status(400).json({ success: false, message: "X draft must contain 1 to 280 characters" });
    }
    if (/[\u{1F000}-\u{1FAFF}]/u.test(draft)) {
        return res.status(400).json({ success: false, message: "X draft must not contain emojis" });
    }
    try {
        const content = await getTarget(targetType, targetId);
        if (!content) {
            return res.status(404).json({ success: false, message: "X post draft not found" });
        }
        const validatedMedia = validateMedia(media);
        let publication = await XPublication.findOne({ targetType, targetId });
        if (publication && publication.status === "published") {
            return res.status(409).json({ success: false, message: "A post has already been published for this target" });
        }
        if (!publication) {
            publication = new XPublication({ targetType, targetId });
        }
        publication.draft = draft.trim();
        publication.media = validatedMedia;
        publication.status = "draft";
        publication.error = null;
        await publication.save();
        return res.status(200).json({ success: true, publishing: publication });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
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
            publication = await XPublication.create({ targetType, targetId, draft: content.xPostDraft, media: [] });
        }
        if (publication.draft.length > 280) {
            return res.status(400).json({ success: false, message: "X post draft must contain 280 characters or fewer" });
        }
        try {
            const mediaIds = [];
            for (const media of publication.media || []) {
                mediaIds.push(await uploadImage(media.url));
            }
            const result = await publishText(publication.draft, mediaIds);
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

module.exports = { getDraft, editDraft, publishDraft, getPublishingStatus };
