const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
    {
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        targetType: {
            type: String,
            enum: ["User", "Resource", "Expedition", "XPost"],
            required: true
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },
        action: {
            type: String,
            required: true,
            trim: true
        },
        fromStatus: {
            type: String,
            default: null
        },
        toStatus: {
            type: String,
            default: null
        },
        feedback: {
            type: String,
            default: null,
            trim: true
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Audit", auditSchema);
