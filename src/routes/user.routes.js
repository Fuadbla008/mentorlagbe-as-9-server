const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/user.controller");

const router = express.Router();

router.get("/profile", requireAuth, controller.getMe);
router.put("/profile", requireAuth, controller.updateProfile);

module.exports = router;
