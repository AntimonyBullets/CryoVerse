const mongoose = require("mongoose");

const AIContent = require("../models/ai-content.model");
const Resource = require("../models/resource.model");
const {
    generateDocumentContent,
    generateVideoContent
} = require("../services/ai-content.service");

const textualResourceTypes = ["report", "publication"];

const serializeAIContent = (content, isAdmin) => {
    const serialized = content.toObject ? content.toObject() : { ...content };
    if (!isAdmin) {
        delete serialized.websiteArticleDraft;
        delete serialized.websiteArticleStatus;
        delete serialized.websiteArticlePublishedAt;
        delete serialized.xPostDraft;
    }
    return serialized;
};

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

    const { generateWebsiteArticle = false, generateXPost = false } = req.body || {};
    if (
        typeof generateWebsiteArticle !== "boolean"
        || typeof generateXPost !== "boolean"
    ) {
        return res.status(400).json({
            success: false,
            message: "generateWebsiteArticle and generateXPost must be boolean values"
        });
    }

    const generationOptions = {
        generateWebsiteArticle,
        generateXPost
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
        if ((generateWebsiteArticle || generateXPost) && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only admins can generate website articles or X posts"
            });
        }
        if (!isAdmin && req.user.role !== "contributor") {
            return res.status(403).json({
                success: false,
                message: "Contributor or admin access is required to generate AI content"
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
            && (!generateXPost || existingContent.xPostDraft)
            && (generateWebsiteArticle || !existingContent.websiteArticleDraft)
            && (generateXPost || !existingContent.xPostDraft)
            && req.query.regenerate !== "true"
        ) {
            return res.status(200).json({
                success: true,
                cached: true,
                aiContent: serializeAIContent(existingContent, isAdmin)
            });
        }

        const generatedContent = isVideo
            ? await generateVideoContent(resource, generationOptions)
            : await generateDocumentContent(resource, generationOptions);
        const updateContent = { ...generatedContent };
        if (!generateWebsiteArticle) {
            delete updateContent.websiteArticleDraft;
        }
        if (!generateXPost) {
            delete updateContent.xPostDraft;
        }
        const aiContent = await AIContent.findOneAndUpdate(
            { resourceId: resource._id },
            {
                resourceId: resource._id,
                sourceFileUrl: resource.fileUrl,
                ...updateContent
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            cached: false,
            aiContent: serializeAIContent(aiContent, isAdmin)
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
