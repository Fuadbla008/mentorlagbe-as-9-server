const express = require("express");
const { verifyTutor } = require("../middleware/auth");
const controller = require("../controllers/tutor.controller");

const router = express.Router();

// Guards are attached per route. A router-level guard would also run for every
// other request because these routers are mounted at "/" in routes/index.js.
router.post("/tuitions", verifyTutor, controller.create);
router.get("/tuitions/mine", verifyTutor, controller.mine);
router.put("/tuitions/:id", verifyTutor, controller.update);
router.delete("/tuitions/:id", verifyTutor, controller.remove);
router.patch("/tuitions/:id/status", verifyTutor, controller.toggleStatus);

module.exports = router;
