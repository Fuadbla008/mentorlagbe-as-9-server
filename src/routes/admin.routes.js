const express = require("express");
const { verifyAdmin } = require("../middleware/auth");
const controller = require("../controllers/admin.controller");

const router = express.Router();

router.use(verifyAdmin);

router.get("/admin/users", controller.users);
router.patch("/admin/users/:id/role", controller.updateRole);
router.get("/admin/tuitions", controller.tuitions);
router.patch("/admin/tuitions/:id/approval", controller.moderate);
router.get("/admin/payments", controller.payments);
router.get("/admin/stats", controller.stats);

module.exports = router;
