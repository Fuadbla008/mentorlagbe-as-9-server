const express = require("express");
const { verifyStudent } = require("../middleware/auth");
const controller = require("../controllers/application.controller");

const router = express.Router();

router.post("/applications", verifyStudent, controller.apply);
router.get("/applications/mine", verifyStudent, controller.mine);
router.delete("/applications/:id", verifyStudent, controller.cancel);

module.exports = router;
