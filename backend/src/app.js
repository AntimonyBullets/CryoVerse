const express = require("express");
const cookieParser = require("cookie-parser");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const repositoryRoutes = require("./routes/repository.routes");
const expeditionRoutes = require("./routes/expedition.routes");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/repository", repositoryRoutes);
app.use("/api/expeditions", expeditionRoutes);

module.exports = app;