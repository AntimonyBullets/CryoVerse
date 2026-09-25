const mongoose = require("mongoose");

const Resource = require("../models/resource.model");
const Expedition = require("../models/expedition.model");
const Audit = require("../models/audit.model");
const { recordAudit } = require("../services/audit.service");

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
    "date"
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
        const isAdmin = req.user && req.user.role === "admin";
        const isContributorOwner = req.user
            && req.user.role === "contributor"
            && req.user.userId;
        const visibilityFilter = isAdmin
            ? {}
            : {
                $or: [
                    { status: { $in: publicStatuses } },
                    ...(isContributorOwner ? [{ contributorId: req.user.userId }] : [])
                ]
            };
        const resource = await Resource.findOne({
            _id: req.params.id,
            ...visibilityFilter
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
        if (req.user.role !== "admin") {
            delete writableData.status;
        }

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

        if (req.user.role !== "admin") {
            writableData.status = "draft";
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
        if (!isAdmin && ["approved", "published"].includes(resource.status)) {
            return res.status(403).json({
                success: false,
                message: "Approved or published resources cannot be edited"
            });
        }

        const writableData = getWritableData(req.body);
        if (req.user.role !== "admin") {
            delete writableData.status;
        }

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
        if (req.user.role !== "admin" && resource.status === "submitted") {
            resource.status = "draft";
            resource.submittedAt = null;
        }
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

const submitResource = async (req, res) => {
    if (!isValidResourceId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid resource ID" });
    }

    try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }
        if (!isResourceOwner(resource, req.user.userId)) {
            return res.status(403).json({ success: false, message: "You can only submit your own resources" });
        }
        if (!["draft", "rejected"].includes(resource.status)) {
            return res.status(400).json({ success: false, message: "Only draft or rejected resources can be submitted" });
        }

        const fromStatus = resource.status;
        resource.status = "submitted";
        resource.submittedAt = new Date();
        resource.reviewReason = null;
        await resource.save();
        await recordAudit({
            actorId: req.user.userId,
            targetType: "Resource",
            targetId: resource._id,
            action: "resource_submitted",
            fromStatus,
            toStatus: "submitted"
        });

        return res.status(200).json({ success: true, message: "Resource submitted for review", resource });
    } catch (error) {
        return handleError(res, error, "submit resource");
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

const getResourceAudit = async (req, res) => {
    if (!isValidResourceId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid resource ID" });
    }
    try {
        const resource = await Resource.findById(req.params.id).select("contributorId");
        if (!resource) {
            return res.status(404).json({ success: false, message: "Resource not found" });
        }
        const isOwner = isResourceOwner(resource, req.user.userId);
        if (req.user.role !== "admin" && !isOwner) {
            return res.status(403).json({ success: false, message: "You do not have permission to view this history" });
        }
        const history = await Audit.find({
            targetType: "Resource",
            targetId: resource._id
        }).select("action fromStatus toStatus feedback createdAt").sort({ createdAt: -1 });
        return res.status(200).json({ success: true, history });
    } catch (error) {
        return handleError(res, error, "get resource history");
    }
};

module.exports = {
    listResources,
    listMyResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    submitResource,
    getResourceAudit
};
