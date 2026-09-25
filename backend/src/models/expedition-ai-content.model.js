const mongoose = require("mongoose");

const expeditionAIContentSchema = new mongoose.Schema(
    {
        expeditionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Expedition",
            required: true,
            unique: true,
            index: true
        },
        sourceFingerprint: {
            type: String,
            required: true
        },
        sourceResourceIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resource"
        }],
        sourceResourceCount: {
            type: Number,
            required: true
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
        generationModel: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ExpeditionAIContent", expeditionAIContentSchema);
