const mongoose = require("mongoose");

const aiContentSchema = new mongoose.Schema(
    {
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resource",
            required: true,
            unique: true,
            index: true
        },
        sourceFileUrl: {
            type: String,
            required: true
        },
        extractedDocumentContent: {
            type: String,
            required: true
        },
        transcript: {
            type: String,
            default: null
        },
        transcriptionModel: {
            type: String,
            default: null
        },
        sourceMediaType: {
            type: String,
            enum: ["pdf", "video"],
            default: "pdf"
        },
        sourceMetadata: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        summary: {
            type: String,
            required: true
        },
        simplifiedExplanation: {
            type: String,
            required: true
        },
        suggestedMetadata: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        websiteArticleDraft: {
            type: String,
            default: null
        },
        xPostDraft: {
            type: String,
            default: null
        },
        documentExtractionMethod: {
            type: String,
            required: true
        },
        generationModel: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("AIContent", aiContentSchema);
