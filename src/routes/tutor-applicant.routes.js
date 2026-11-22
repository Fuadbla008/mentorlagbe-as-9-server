const express = require("express");
const { verifyTutor } = require("../middleware/auth");
const controller = require("../controllers/tutor-applicant.controller");

const router = express.Router();

router.use(verifyTutor);

router.get("/applications/incoming", controller.incoming);
router.patch("/applications/:id/status", controller.updateStatus);

module.exports = router;
