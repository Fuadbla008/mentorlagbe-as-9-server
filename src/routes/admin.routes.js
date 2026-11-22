const express = require("express");
const { verifyAdmin } = require("../middleware/auth");
const controller = require("../controllers/admin.controller");

const router = express.Router();

router.get("/admin/users", verifyAdmin, controller.users);
router.patch("/admin/users/:id/role", verifyAdmin, controller.updateRole);
router.get("/admin/tuitions", verifyAdmin, controller.tuitions);
router.patch("/admin/tuitions/:id/approval", verifyAdmin, controller.moderate);
router.get("/admin/payments", verifyAdmin, controller.payments);
router.get("/admin/stats", verifyAdmin, controller.stats);

module.exports = router;
