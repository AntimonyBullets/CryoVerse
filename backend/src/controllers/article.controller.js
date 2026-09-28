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

const listPublishedArticles = async (req, res) => {
    try {
        const { search, targetType } = req.query || {};
        let articles = [];

        if (!targetType || targetType === "all" || targetType === "resource") {
            const resourceArticles = await AIContent.find({ websiteArticleStatus: "published" })
                .populate("resourceId");
            for (const item of resourceArticles) {
                if (item.resourceId) {
                    articles.push({
                        targetType: "resource",
                        targetId: item.resourceId._id,
                        title: item.resourceId.title,
                        description: item.resourceId.description,
                        summary: item.summary,
                        content: item.websiteArticleDraft,
                        publishedAt: item.websiteArticlePublishedAt || item.updatedAt,
                        category: item.resourceId.category,
                        tags: item.resourceId.tags || [],
                        source: item.resourceId.source
                    });
                }
            }
        }

        if (!targetType || targetType === "all" || targetType === "expedition") {
            const expeditionArticles = await ExpeditionAIContent.find({ websiteArticleStatus: "published" })
                .populate("expeditionId");
            for (const item of expeditionArticles) {
                if (item.expeditionId) {
                    articles.push({
                        targetType: "expedition",
                        targetId: item.expeditionId._id,
                        title: item.expeditionId.name,
                        description: item.expeditionId.description,
                        summary: item.summary,
                        content: item.websiteArticleDraft,
                        publishedAt: item.websiteArticlePublishedAt || item.updatedAt,
                        category: "Expedition",
                        tags: item.expeditionId.location ? [item.expeditionId.location] : [],
                        location: item.expeditionId.location,
                        region: item.expeditionId.region,
                        year: item.expeditionId.year
                    });
                }
            }
        }

        if (search && search.trim()) {
            const term = search.trim().toLowerCase();
            articles = articles.filter((a) => {
                const titleMatch = a.title && a.title.toLowerCase().includes(term);
                const descMatch = a.description && a.description.toLowerCase().includes(term);
                const summaryMatch = a.summary && a.summary.toLowerCase().includes(term);
                const contentMatch = a.content && a.content.toLowerCase().includes(term);
                const categoryMatch = a.category && a.category.toLowerCase().includes(term);
                const tagMatch = a.tags && a.tags.some(t => t.toLowerCase().includes(term));
                return titleMatch || descMatch || summaryMatch || contentMatch || categoryMatch || tagMatch;
            });
        }

        articles.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

        return res.status(200).json({
            success: true,
            articles
        });
    } catch (error) {
        console.error("List published articles failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to list published articles"
        });
    }
};

module.exports = {
    listPublishedArticles,
    getArticle,
    getPublishedArticle,
    editArticle,
    publishArticle,
    unpublishArticle
};
