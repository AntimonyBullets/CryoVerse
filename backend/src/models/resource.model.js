const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            minlength: [2, "Title must be at least 2 characters long"]
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true
        },
        type: {
            type: String,
            required: [true, "Type is required"],
            trim: true
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true
        },
        tags: {
            type: [String],
            default: []
        },
        source: {
            type: String,
            trim: true
        },
        sourceUrl: {
            type: String,
            trim: true
        },
        fileUrl: {
            type: String,
            trim: true
        },
        expeditionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Expedition"
        },
        contributorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Contributor is required"]
        },
        date: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ["draft", "submitted", "approved", "rejected", "published"],
            default: "draft"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Resource", resourceSchema);
