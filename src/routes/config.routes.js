const express = require("express");
const controller = require("../controllers/config.controller");

const router = express.Router();

router.get("/config", controller.getConfig);

module.exports = router;
