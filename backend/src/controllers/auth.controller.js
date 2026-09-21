const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");

const createToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        {
            userId: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "20d"
        }
    );
};

const serializeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
});

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "user"
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: serializeUser(user),
            token: createToken(user)
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors)
                    .map((validationError) => validationError.message)
                    .join(", ")
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists"
            });
        }

        console.error("Registration failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to register user"
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
        const passwordMatches = user && await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: serializeUser(user),
            token: createToken(user)
        });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to log in"
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: serializeUser(user)
        });
    } catch (error) {
        console.error("Fetching current user failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch current user"
        });
    }
};

module.exports = {
    register,
    login,
    getCurrentUser
};
