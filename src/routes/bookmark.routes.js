const express = require("express");
const { verifyStudent } = require("../middleware/auth");
const controller = require("../controllers/bookmark.controller");

const router = express.Router();

router.get("/bookmarks/mine", verifyStudent, controller.mine);
router.post("/bookmarks", verifyStudent, controller.toggle);

module.exports = router;
