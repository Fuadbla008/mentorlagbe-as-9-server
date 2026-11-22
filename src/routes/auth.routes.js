const express = require("express");
const rateLimit = require("../middleware/rate-limit");
const { verifyStudent, verifyTutor, requireAuth } = require("../middleware/auth");
const controller = require("../controllers/auth.controller");

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 25, message: "Too many sign-in attempts." });

router.post("/signup", authLimiter, controller.signup);
router.post("/signin", authLimiter, controller.signin);
router.post("/signout", controller.signout);
router.get("/me", requireAuth, controller.me);
router.get("/student-check", verifyStudent, (_req, res) => res.json({ ok: true }));
router.get("/tutor-check", verifyTutor, (_req, res) => res.json({ ok: true }));

module.exports = router;
