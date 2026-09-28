const mongoose = require("mongoose");

const Expedition = require("../models/expedition.model");
const Resource = require("../models/resource.model");

const publicStatuses = ["approved", "published"];
const writableFields = ["name", "year", "date", "location", "region", "description"];

const getWritableData = (body = {}) => writableFields.reduce((data, field) => {
    if (body[field] !== undefined) {
        data[field] = body[field];
    }

    return data;
}, {});

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const handleError = (res, error, operation) => {
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: error.name === "ValidationError"
                ? Object.values(error.errors).map((validationError) => validationError.message).join(", ")
                : "Invalid expedition data"
        });
    }

    console.error(`${operation} failed:`, error.message);
    return res.status(500).json({
        success: false,
        message: `Unable to ${operation.toLowerCase()}`
    });
};

const withPublicResources = async (expedition) => {
    const resources = await Resource.find({
        expeditionId: expedition._id,
        status: { $in: publicStatuses }
    }).sort({ createdAt: -1 });

    return {
        ...expedition.toObject(),
        resources
    };
};

const listExpeditions = async (req, res) => {
    try {
        const expeditions = await Expedition.find().sort({ year: -1, date: -1, createdAt: -1 });

        return res.status(200).json({
            success: true,
            expeditions
        });
    } catch (error) {
        return handleError(res, error, "list expeditions");
    }
};

const getExpedition = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid expedition ID" });
    }

    try {
        const expedition = await Expedition.findById(req.params.id);

        if (!expedition) {
            return res.status(404).json({ success: false, message: "Expedition not found" });
        }

        return res.status(200).json({
            success: true,
            expedition: await withPublicResources(expedition)
        });
    } catch (error) {
        return handleError(res, error, "get expedition");
    }
};

const createExpedition = async (req, res) => {
    try {
        const expedition = await Expedition.create(getWritableData(req.body));

        return res.status(201).json({
            success: true,
            message: "Expedition created successfully",
            expedition
        });
    } catch (error) {
        return handleError(res, error, "create expedition");
    }
};

const updateExpedition = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid expedition ID" });
    }

    try {
        const expedition = await Expedition.findById(req.params.id);

        if (!expedition) {
            return res.status(404).json({ success: false, message: "Expedition not found" });
        }

        Object.assign(expedition, getWritableData(req.body));
        await expedition.save();

        return res.status(200).json({
            success: true,
            message: "Expedition updated successfully",
            expedition
        });
    } catch (error) {
        return handleError(res, error, "update expedition");
    }
};

const deleteExpedition = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid expedition ID" });
    }

    try {
        const expedition = await Expedition.findById(req.params.id);

        if (!expedition) {
            return res.status(404).json({ success: false, message: "Expedition not found" });
        }

        await Resource.updateMany(
            { expeditionId: expedition._id },
            { $unset: { expeditionId: 1 } }
        );
        await expedition.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Expedition deleted successfully"
        });
    } catch (error) {
        return handleError(res, error, "delete expedition");
    }
};

module.exports = {
    listExpeditions,
    getExpedition,
    createExpedition,
    updateExpedition,
    deleteExpedition
};
