const mongoose = require("mongoose");

const expeditionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Expedition name is required"],
            trim: true,
            minlength: [2, "Expedition name must be at least 2 characters long"]
        },
        year: {
            type: Number,
            min: [1800, "Expedition year must be valid"],
            max: [new Date().getFullYear() + 1, "Expedition year must be valid"]
        },
        date: {
            type: Date
        },
        location: {
            type: String,
            trim: true
        },
        region: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            required: [true, "Expedition description is required"],
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Expedition", expeditionSchema);
