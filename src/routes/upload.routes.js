const express = require("express");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rate-limit");
const upload = require("../middleware/upload");
const controller = require("../controllers/upload.controller");

const router = express.Router();

router.post(
  "/upload/image",
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 40, message: "Too many uploads. Try again later." }),
  upload,
  controller.uploadImage,
);

module.exports = router;
