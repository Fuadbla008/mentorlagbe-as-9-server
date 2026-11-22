const express = require("express");
const controller = require("../controllers/tuition.controller");

const router = express.Router();

router.get("/tuitions", controller.search);
router.get("/tuitions/featured", controller.featured);
router.get("/stats", controller.stats);
router.get("/tuitions/:id", controller.getById);

module.exports = router;
