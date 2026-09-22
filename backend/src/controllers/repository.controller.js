const mongoose = require("mongoose");

const Resource = require("../models/resource.model");
const Expedition = require("../models/expedition.model");

const publicStatuses = ["approved", "published"];
const writableFields = [
    "title",
    "description",
    "type",
    "category",
    "tags",
    "source",
    "sourceUrl",
    "fileUrl",
    "expeditionId",
    "date",
    "status"
];

const getWritableData = (body = {}) => writableFields.reduce((data, field) => {
    if (body[field] !== undefined) {
        data[field] = body[field];
    }

    return data;
}, {});

const isValidResourceId = (id) => mongoose.Types.ObjectId.isValid(id);
const isResourceOwner = (resource, userId) => (
    resource.contributorId && resource.contributorId.toString() === userId
);

const handleError = (res, error, operation) => {
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: error.name === "ValidationError"
                ? Object.values(error.errors).map((validationError) => validationError.message).join(", ")
                : "Invalid resource data"
        });
    }

    console.error(`${operation} failed:`, error.message);
    return res.status(500).json({
        success: false,
        message: `Unable to ${operation.toLowerCase()}`
    });
};

const listResources = async (req, res) => {
    try {
        const filters = {
            status: { $in: publicStatuses }
        };

        if (req.query.search) {
            const search = req.query.search.trim();
            if (search) {
                const searchExpression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
                filters.$or = [
                    { title: searchExpression },
                    { description: searchExpression },
                    { source: searchExpression }
                ];
            }
        }

        if (req.query.type) {
            filters.type = req.query.type.trim();
        }

        if (req.query.category) {
            filters.category = req.query.category.trim();
        }

        if (req.query.expeditionId) {
            if (!isValidResourceId(req.query.expeditionId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expedition ID"
                });
            }
            filters.expeditionId = req.query.expeditionId;
        }

        const resources = await Resource.find(filters)
            .populate("expeditionId", "name year date location region description")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            resources
        });
    } catch (error) {
        return handleError(res, error, "list resources");
    }
};

const listMyResources = async (req, res) => {
    try {
        const resources = await Resource.find({
            contributorId: req.user.userId
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            resources
        });
    } catch (error) {
        return handleError(res, error, "list own resources");
    }
};

const getResource = async (req, res) => {
    if (!isValidResourceId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid resource ID"
        });
    }

    try {
        const resource = await Resource.findOne({
            _id: req.params.id,
            status: { $in: publicStatuses }
        }).populate("expeditionId", "name year date location region description");

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        return res.status(200).json({
            success: true,
            resource
        });
    } catch (error) {
        return handleError(res, error, "get resource");
    }
};

const createResource = async (req, res) => {
    try {
        const writableData = getWritableData(req.body);

        if (writableData.expeditionId) {
            if (!isValidResourceId(writableData.expeditionId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expedition ID"
                });
            }

            const expedition = await Expedition.exists({ _id: writableData.expeditionId });
            if (!expedition) {
                return res.status(400).json({
                    success: false,
                    message: "Expedition not found"
                });
            }
        }

        const resource = await Resource.create({
            ...writableData,
            contributorId: req.user.userId
        });

        return res.status(201).json({
            success: true,
            message: "Resource created successfully",
            resource
        });
    } catch (error) {
        return handleError(res, error, "create resource");
    }
};

const updateResource = async (req, res) => {
    if (!isValidResourceId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid resource ID"
        });
    }

    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const isAdmin = req.user.role === "admin";
        const isOwner = isResourceOwner(resource, req.user.userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own resources"
            });
        }

        const writableData = getWritableData(req.body);

        if (writableData.expeditionId) {
            if (!isValidResourceId(writableData.expeditionId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expedition ID"
                });
            }

            const expedition = await Expedition.exists({ _id: writableData.expeditionId });
            if (!expedition) {
                return res.status(400).json({
                    success: false,
                    message: "Expedition not found"
                });
            }
        }

        Object.assign(resource, writableData);
        await resource.save();

        return res.status(200).json({
            success: true,
            message: "Resource updated successfully",
            resource
        });
    } catch (error) {
        return handleError(res, error, "update resource");
    }
};

const deleteResource = async (req, res) => {
    if (!isValidResourceId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid resource ID"
        });
    }

    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const isAdmin = req.user.role === "admin";
        const isOwner = isResourceOwner(resource, req.user.userId);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own resources"
            });
        }

        await resource.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Resource deleted successfully"
        });
    } catch (error) {
        return handleError(res, error, "delete resource");
    }
};

module.exports = {
    listResources,
    listMyResources,
    getResource,
    createResource,
    updateResource,
    deleteResource
};
