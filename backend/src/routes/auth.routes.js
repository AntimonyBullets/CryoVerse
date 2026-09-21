const express = require("express");

const {
    register,
    login,
    getCurrentUser
} = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getCurrentUser);

module.exports = router;
