const express = require("express");
const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const tutorRoutes = require("./tutor.routes");
const tutorApplicantRoutes = require("./tutor-applicant.routes");
const tuitionRoutes = require("./tuition.routes");
const userRoutes = require("./user.routes");
const applicationRoutes = require("./application.routes");
const bookmarkRoutes = require("./bookmark.routes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "MentorLagbe API is running.", uptime: process.uptime() });
});

router.use("/auth", authRoutes);
router.use("/", adminRoutes);
// Tutor-specific paths are mounted first so /tuitions/mine is not swallowed
// by the public /tuitions/:id route.
router.use("/", tutorRoutes);
router.use("/", tutorApplicantRoutes);
router.use("/", tuitionRoutes);
router.use("/", userRoutes);
router.use("/", applicationRoutes);
router.use("/", bookmarkRoutes);

module.exports = router;
