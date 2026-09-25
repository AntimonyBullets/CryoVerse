const Audit = require("../models/audit.model");

const recordAudit = async ({
    actorId,
    targetType,
    targetId,
    action,
    fromStatus = null,
    toStatus = null,
    feedback = null,
    details = null
}) => Audit.create({
    actorId,
    targetType,
    targetId,
    action,
    fromStatus,
    toStatus,
    feedback,
    details
});

module.exports = { recordAudit };
