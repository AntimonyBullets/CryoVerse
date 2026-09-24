const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const token = req.cookies && req.cookies[process.env.COOKIE_NAME || "token"];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured");
        return res.status(500).json({
            success: false,
            message: "Authentication is not configured"
        });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

const optionalAuthenticate = (req, res, next) => {
    const token = req.cookies && req.cookies[process.env.COOKIE_NAME || "token"];

    if (!token || !process.env.JWT_SECRET) {
        return next();
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        // Preserve public access when no valid authentication is provided.
    }

    return next();
};

const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "You do not have permission to access this resource"
        });
    }

    return next();
};

module.exports = {
    authenticate,
    optionalAuthenticate,
    authorizeRoles
};
