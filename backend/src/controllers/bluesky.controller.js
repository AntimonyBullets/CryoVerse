const mongoose = require("mongoose");

const AIContent = require("../models/ai-content.model");
const ExpeditionAIContent = require("../models/expedition-ai-content.model");
const BlueskyPublication = require("../models/bluesky-publication.model");
const { recordAudit } = require("../services/audit.service");
const {
    BLUESKY_CHAR_LIMIT,
    BLUESKY_MAX_IMAGES,
    BLUESKY_ALT_MAX_LENGTH,
    publishPost
} = require("../services/bluesky.service");

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const getTarget = async (targetType, targetId) => {
    if (!["Resource", "Expedition"].includes(targetType) || !isId(targetId)) {
        return null;
    }
    const Model = targetType === "Resource" ? AIContent : ExpeditionAIContent;
    const content = await Model.findOne({
        [targetType === "Resource" ? "resourceId" : "expeditionId"]: targetId
    });
    return content && content.blueskyPostDraft ? content : null;
};

const getPublishingStatus = async (req, res) => {
    const { targetType, targetId } = req.query;
    if (!["Resource", "Expedition"].includes(targetType) || !isId(targetId)) {
        return res.status(400).json({ success: false, message: "Valid targetType and targetId are required" });
    }
    const publication = await BlueskyPublication.findOne({ targetType, targetId });
    if (!publication) {
        return res.status(404).json({ success: false, message: "Bluesky publishing status not found" });
    }
    return res.status(200).json({ success: true, publishing: publication });
};

const getDraft = async (req, res) => {
    const { targetType, targetId } = req.query;
    if (!["Resource", "Expedition"].includes(targetType) || !isId(targetId)) {
        return res.status(400).json({ success: false, message: "Valid targetType and targetId are required" });
    }
    const content = await getTarget(targetType, targetId);
    if (!content) {
        return res.status(404).json({ success: false, message: "Bluesky post draft not found" });
    }
    const publication = await BlueskyPublication.findOne({ targetType, targetId });
    return res.status(200).json({
        success: true,
        draft: publication ? publication.draft : content.blueskyPostDraft,
        publishing: publication || null
    });
};

const validateMedia = (media) => {
    if (media === undefined) {
        return [];
    }
    if (!Array.isArray(media) || media.length > BLUESKY_MAX_IMAGES) {
        throw Object.assign(
            new Error(`media must be an array with at most ${BLUESKY_MAX_IMAGES} images`),
            { statusCode: 400 }
        );
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
            || !/\.(jpg|jpeg|png|gif|webp)$/i.test(url.pathname)
        ) {
            throw Object.assign(new Error("Only Cloudinary image URLs are supported for Bluesky posts"), { statusCode: 400 });
        }
        if (item.alt !== undefined && item.alt !== null && typeof item.alt !== "string") {
            throw Object.assign(new Error("Each media alt text must be a string"), { statusCode: 400 });
        }
        if (typeof item.alt === "string" && item.alt.trim().length > BLUESKY_ALT_MAX_LENGTH) {
            throw Object.assign(
                new Error(`Alt text must be ${BLUESKY_ALT_MAX_LENGTH} characters or fewer`),
                { statusCode: 400 }
            );
        }
        return {
            url: item.url,
            publicId: typeof item.publicId === "string" ? item.publicId : null,
            resourceType: "image",
            alt: typeof item.alt === "string" ? item.alt.trim() : ""
        };
    });
};

const editDraft = async (req, res) => {
    const { targetType, targetId, draft, media } = req.body || {};
    if (!["Resource", "Expedition"].includes(targetType) || !isId(targetId)) {
        return res.status(400).json({ success: false, message: "Valid targetType and targetId are required" });
    }
    if (typeof draft !== "string" || !draft.trim() || draft.trim().length > BLUESKY_CHAR_LIMIT) {
        return res.status(400).json({ success: false, message: `Bluesky draft must contain 1 to ${BLUESKY_CHAR_LIMIT} characters` });
    }
    if (/[\u{1F000}-\u{1FAFF}]/u.test(draft)) {
        return res.status(400).json({ success: false, message: "Bluesky draft must not contain emojis" });
    }
    try {
        const content = await getTarget(targetType, targetId);
        if (!content) {
            return res.status(404).json({ success: false, message: "Bluesky post draft not found" });
        }
        const validatedMedia = validateMedia(media);
        let publication = await BlueskyPublication.findOne({ targetType, targetId });
        if (publication && publication.status === "published") {
            return res.status(409).json({ success: false, message: "A post has already been published for this target" });
        }
        if (!publication) {
            publication = new BlueskyPublication({ targetType, targetId });
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
            return res.status(404).json({ success: false, message: "Bluesky post draft not found" });
        }
        let publication = await BlueskyPublication.findOne({ targetType, targetId });
        if (publication && publication.status === "published") {
            return res.status(409).json({ success: false, message: "This draft has already been published", publishing: publication });
        }
        // Publishing only ever acts on a saved, admin-reviewed draft. A draft
        // that has never been saved is refused rather than published blind.
        if (!publication || !publication.draft) {
            return res.status(400).json({
                success: false,
                message: "Save the draft before publishing. Publishing is never automatic."
            });
        }
        if (publication.draft.length > BLUESKY_CHAR_LIMIT) {
            return res.status(400).json({ success: false, message: `Bluesky post draft must contain ${BLUESKY_CHAR_LIMIT} characters or fewer` });
        }
        try {
            const result = await publishPost(publication.draft, publication.media || []);
            publication.status = "published";
            publication.blueskyPostUri = result.uri;
            publication.blueskyPostCid = result.cid;
            publication.blueskyPostUrl = result.url;
            publication.publishedAt = new Date();
            publication.error = null;
            await publication.save();
            await recordAudit({
                actorId: req.user.userId,
                targetType: "BlueskyPost",
                targetId: publication._id,
                action: "bluesky_post_published",
                details: { targetType, targetId, blueskyPostUri: result.uri, blueskyPostUrl: result.url }
            });
            return res.status(200).json({ success: true, publishing: publication });
        } catch (error) {
            // The draft and its media are preserved so the admin can correct and retry.
            publication.status = "failed";
            publication.error = error.message;
            await publication.save();
            await recordAudit({
                actorId: req.user.userId,
                targetType: "BlueskyPost",
                targetId: publication._id,
                action: "bluesky_post_failed",
                details: { targetType, targetId, error: error.message }
            });
            return res.status(error.statusCode || 502).json({
                success: false,
                message: error.message,
                publishing: publication
            });
        }
    } catch (error) {
        console.error("Bluesky draft publishing failed:", error.message);
        return res.status(error.statusCode || 502).json({ success: false, message: error.message });
    }
};

module.exports = { getDraft, editDraft, publishDraft, getPublishingStatus };
