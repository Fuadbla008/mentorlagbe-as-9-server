const express = require("express");
const authRoutes = require("./auth.routes");
const tuitionRoutes = require("./tuition.routes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "MentorLagbe API is running.", uptime: process.uptime() });
});

router.use("/auth", authRoutes);
router.use("/", tuitionRoutes);

module.exports = router;
