const express = require("express");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "MentorLagbe API is running.", uptime: process.uptime() });
});

module.exports = router;
