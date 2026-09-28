const mongoose = require("mongoose");

const { BLUESKY_CHAR_LIMIT } = require("../services/bluesky.service");

const blueskyPublicationSchema = new mongoose.Schema(
    {
        targetType: {
            type: String,
            enum: ["Resource", "Expedition"],
            required: true
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        draft: {
            type: String,
            required: true,
            maxlength: BLUESKY_CHAR_LIMIT
        },
        media: [{
            url: { type: String, required: true },
            publicId: { type: String, default: null },
            resourceType: { type: String, enum: ["image"], default: "image" },
            alt: { type: String, default: "" }
        }],
        status: {
            type: String,
            enum: ["draft", "published", "failed"],
            default: "draft"
        },
        blueskyPostUri: {
            type: String,
            default: null
        },
        blueskyPostCid: {
            type: String,
            default: null
        },
        blueskyPostUrl: {
            type: String,
            default: null
        },
        publishedAt: {
            type: Date,
            default: null
        },
        error: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

blueskyPublicationSchema.index({ targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("BlueskyPublication", blueskyPublicationSchema);
