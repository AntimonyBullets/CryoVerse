const mongoose = require("mongoose");

const xPublicationSchema = new mongoose.Schema(
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
            maxlength: 280
        },
        status: {
            type: String,
            enum: ["draft", "published", "failed"],
            default: "draft"
        },
        xPostId: {
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

xPublicationSchema.index({ targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("XPublication", xPublicationSchema);
