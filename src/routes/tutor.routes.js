const express = require("express");
const { verifyTutor } = require("../middleware/auth");
const controller = require("../controllers/tutor.controller");

const router = express.Router();

router.use(verifyTutor);

router.post("/tuitions", controller.create);
router.get("/tuitions/mine", controller.mine);
router.put("/tuitions/:id", controller.update);
router.delete("/tuitions/:id", controller.remove);
router.patch("/tuitions/:id/status", controller.toggleStatus);

module.exports = router;
