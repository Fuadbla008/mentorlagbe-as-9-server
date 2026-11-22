const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/payment.controller");

const router = express.Router();

router.post("/payments/checkout", requireAuth, controller.checkout);
router.get("/payments/verify", requireAuth, controller.verify);

module.exports = router;
