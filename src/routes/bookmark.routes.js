const express = require("express");
const { verifyStudent } = require("../middleware/auth");
const controller = require("../controllers/bookmark.controller");

const router = express.Router();

router.use(verifyStudent);

router.get("/bookmarks/mine", controller.mine);
router.post("/bookmarks", controller.toggle);

module.exports = router;
