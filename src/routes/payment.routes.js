const express = require("express");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rate-limit");
const controller = require("../controllers/payment.controller");

const router = express.Router();
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many payment requests. Please try again later.",
});

router.post("/payments/checkout", requireAuth, paymentLimiter, controller.checkout);
router.get("/payments/verify", requireAuth, paymentLimiter, controller.verify);
// Stripe redirects the browser here without an Authorization header, so this
// route is public and identifies the payment by its Checkout session id.
router.get("/payments/return", paymentLimiter, controller.returnFromCheckout);

module.exports = router;
