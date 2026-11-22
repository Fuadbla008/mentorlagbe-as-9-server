const express = require("express");
const { verifyTutor } = require("../middleware/auth");
const controller = require("../controllers/tutor-applicant.controller");

const router = express.Router();

router.get("/applications/incoming", verifyTutor, controller.incoming);
router.patch("/applications/:id/status", verifyTutor, controller.updateStatus);

module.exports = router;
