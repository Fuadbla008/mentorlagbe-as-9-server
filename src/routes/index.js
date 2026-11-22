const express = require("express");
const authRoutes = require("./auth.routes");
const tuitionRoutes = require("./tuition.routes");
const userRoutes = require("./user.routes");
const applicationRoutes = require("./application.routes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "MentorLagbe API is running.", uptime: process.uptime() });
});

router.use("/auth", authRoutes);
router.use("/", tuitionRoutes);
router.use("/", userRoutes);
router.use("/", applicationRoutes);

module.exports = router;
