const mongoose = require("mongoose");

const Resource = require("../models/resource.model");
const AIContent = require("../models/ai-content.model");
const Expedition = require("../models/expedition.model");
const ExpeditionAIContent = require("../models/expedition-ai-content.model");
const { recordAudit } = require("../services/audit.service");

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const getTarget = async (targetType, id) => {
    if (!isId(id)) {
        return null;
    }
    if (targetType === "resource") {
        const resource = await Resource.findById(id);
        const content = await AIContent.findOne({ resourceId: id });
        return resource && content ? { resource, content } : null;
    }
    if (targetType === "expedition") {
        const expedition = await Expedition.findById(id);
        const content = await ExpeditionAIContent.findOne({ expeditionId: id });
        return expedition && content ? { expedition, content } : null;
    }
    return null;
};

const getArticle = async (req, res) => {
    const target = await getTarget(req.params.targetType, req.params.id);
    if (!target || !target.content.websiteArticleDraft) {
        return res.status(404).json({ success: false, message: "Website article not found" });
    }
    return res.status(200).json({
        success: true,
        article: {
            targetType: req.params.targetType,
            targetId: req.params.id,
            content: target.content.websiteArticleDraft,
            status: target.content.websiteArticleStatus || "draft",
            publishedAt: target.content.websiteArticlePublishedAt || null
        }
    });
};

const getPublishedArticle = async (req, res) => {
    const target = await getTarget(req.params.targetType, req.params.id);
    if (
        !target
        || !target.content.websiteArticleDraft
        || target.content.websiteArticleStatus !== "published"
    ) {
        return res.status(404).json({ success: false, message: "Published article not found" });
    }
    return res.status(200).json({
        success: true,
        article: {
            targetType: req.params.targetType,
            targetId: req.params.id,
            content: target.content.websiteArticleDraft,
            publishedAt: target.content.websiteArticlePublishedAt
        }
    });
};

const editArticle = async (req, res) => {
    const target = await getTarget(req.params.targetType, req.params.id);
    if (!target) {
        return res.status(404).json({ success: false, message: "AI content not found" });
    }
    const { content } = req.body || {};
    if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ success: false, message: "Article content is required" });
    }
    if (target.content.websiteArticleStatus === "published") {
        return res.status(409).json({ success: false, message: "Unpublish the article before editing it" });
    }
    target.content.websiteArticleDraft = content.trim();
    target.content.websiteArticleStatus = "draft";
    target.content.websiteArticlePublishedAt = null;
    await target.content.save();
    return res.status(200).json({ success: true, article: target.content });
};

const publishArticle = async (req, res) => {
    const target = await getTarget(req.params.targetType, req.params.id);
    if (!target || !target.content.websiteArticleDraft) {
        return res.status(404).json({ success: false, message: "Website article draft not found" });
    }
    if (req.params.targetType === "resource" && !["approved", "published"].includes(target.resource.status)) {
        return res.status(400).json({ success: false, message: "Only approved resources can publish articles" });
    }
    target.content.websiteArticleStatus = "published";
    target.content.websiteArticlePublishedAt = new Date();
    await target.content.save();
    await recordAudit({
        actorId: req.user.userId,
        targetType: req.params.targetType === "resource" ? "Resource" : "Expedition",
        targetId: req.params.id,
        action: "website_article_published"
    });
    return res.status(200).json({ success: true, article: target.content });
};

const unpublishArticle = async (req, res) => {
    const target = await getTarget(req.params.targetType, req.params.id);
    if (!target || target.content.websiteArticleStatus !== "published") {
        return res.status(404).json({ success: false, message: "Published article not found" });
    }
    target.content.websiteArticleStatus = "draft";
    target.content.websiteArticlePublishedAt = null;
    await target.content.save();
    await recordAudit({
        actorId: req.user.userId,
        targetType: req.params.targetType === "resource" ? "Resource" : "Expedition",
        targetId: req.params.id,
        action: "website_article_unpublished"
    });
    return res.status(200).json({ success: true, article: target.content });
};

module.exports = {
    getArticle,
    getPublishedArticle,
    editArticle,
    publishArticle,
    unpublishArticle
};
