const mongoose = require("mongoose");

const AIContent = require("../models/ai-content.model");
const Resource = require("../models/resource.model");
const {
    generateDocumentContent,
    generateVideoContent
} = require("../services/ai-content.service");

const textualResourceTypes = ["report", "publication"];

const isValidPdfUrl = (fileUrl) => {
    try {
        const url = new URL(fileUrl);
        return url.protocol === "http:"
            || url.protocol === "https:"
            ? url.pathname.toLowerCase().endsWith(".pdf")
            : false;
    } catch (error) {
        return false;
    }
};

const isValidCloudinaryVideoUrl = (fileUrl) => {
    try {
        const url = new URL(fileUrl);
        return (url.protocol === "http:" || url.protocol === "https:")
            && url.hostname.endsWith(".cloudinary.com")
            && url.pathname.includes("/video/upload/")
            && /\.(mp4|mov|m4v|webm|mkv|avi|mpeg|mpg|3gp)$/i.test(url.pathname);
    } catch (error) {
        return false;
    }
};

const generateResourceAIContent = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid resource ID"
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

    const generationOptions = {
        generateWebsiteArticle,
        generateLinkedInPost
    };

    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const isAdmin = req.user.role === "admin";
        const isOwner = resource.contributorId
            && resource.contributorId.toString() === req.user.userId;
        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "You can only generate content for your own resources"
            });
        }

        const resourceType = resource.type.toLowerCase();
        const isVideo = isValidCloudinaryVideoUrl(resource.fileUrl);
        const isPdf = textualResourceTypes.includes(resourceType) && isValidPdfUrl(resource.fileUrl);
        if (!isPdf && !isVideo) {
            return res.status(400).json({
                success: false,
                message: "AI content requires a report or publication PDF or a valid Cloudinary video URL"
            });
        }

        const existingContent = await AIContent.findOne({ resourceId: resource._id });
        const expectedExtractionMethod = isVideo ? "ffmpeg+groq-whisper" : "pdf-parse";
        if (
            existingContent
            && existingContent.sourceFileUrl === resource.fileUrl
            && existingContent.documentExtractionMethod === expectedExtractionMethod
            && existingContent.extractedDocumentContent
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

        const generatedContent = isVideo
            ? await generateVideoContent(resource, generationOptions)
            : await generateDocumentContent(resource, generationOptions);
        const aiContent = await AIContent.findOneAndUpdate(
            { resourceId: resource._id },
            {
                resourceId: resource._id,
                sourceFileUrl: resource.fileUrl,
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
        console.error("AI content generation failed:", error.message);
        return res.status(error.statusCode || 502).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Unable to generate AI content"
        });
    }
};

module.exports = {
    generateResourceAIContent
};
