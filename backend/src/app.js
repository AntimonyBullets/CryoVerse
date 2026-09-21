const express = require("express");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);

module.exports = app;