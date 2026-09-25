const mongoose = require("mongoose");

const Expedition = require("../models/expedition.model");
const Resource = require("../models/resource.model");
const AIContent = require("../models/ai-content.model");
const ExpeditionAIContent = require("../models/expedition-ai-content.model");
const {
    generateExpeditionContent,
    getExpeditionSource
} = require("../services/ai-content.service");

const generateExpeditionAIContent = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid expedition ID"
        });
    }

    const { generateWebsiteArticle = false, generateLinkedInPost = false } = req.body || {};
    if (
        typeof generateWebsiteArticle !== "boolean"
        || typeof generateLinkedInPost !== "boolean"
    ) {
        return res.status(400).json({
            success: false,
            message: "generateWebsiteArticle and generateLinkedInPost must be boolean values"
        });
    }

    try {
        const expedition = await Expedition.findById(req.params.id);
        if (!expedition) {
            return res.status(404).json({
                success: false,
                message: "Expedition not found"
            });
        }

        const resources = await Resource.find({ expeditionId: expedition._id })
            .sort({ createdAt: 1 });
        const resourceAIContent = await AIContent.find({
            resourceId: { $in: resources.map((resource) => resource._id) }
        });
        const aiContentByResourceId = new Map(
            resourceAIContent.map((content) => [content.resourceId.toString(), content])
        );
        const linkedResources = resources.map((resource) => ({
            resource,
            aiContent: aiContentByResourceId.get(resource._id.toString()) || null
        }));
        const source = await getExpeditionSource(expedition, linkedResources);
        const existingContent = await ExpeditionAIContent.findOne({
            expeditionId: expedition._id
        });

        if (
            existingContent
            && existingContent.sourceFingerprint === source.sourceFingerprint
            && (!generateWebsiteArticle || existingContent.websiteArticleDraft)
            && (!generateLinkedInPost || existingContent.linkedInPostDraft)
            && (generateWebsiteArticle || !existingContent.websiteArticleDraft)
            && (generateLinkedInPost || !existingContent.linkedInPostDraft)
            && req.query.regenerate !== "true"
        ) {
            return res.status(200).json({
                success: true,
                cached: true,
                aiContent: existingContent
            });
        }

        const generatedContent = await generateExpeditionContent(
            expedition,
            linkedResources,
            { generateWebsiteArticle, generateLinkedInPost },
            source
        );
        const aiContent = await ExpeditionAIContent.findOneAndUpdate(
            { expeditionId: expedition._id },
            {
                expeditionId: expedition._id,
                ...generatedContent
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            cached: false,
            aiContent
        });
    } catch (error) {
        console.error("Expedition AI content generation failed:", error.message);
        return res.status(error.statusCode || 502).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Unable to generate expedition AI content"
        });
    }
};

module.exports = {
    generateExpeditionAIContent
};
