const { z } = require("zod");
const { getStripe } = require("../config/stripe");
const env = require("../config/env");
const User = require("../models/user.model");
const Payment = require("../models/payment.model");
const ApiError = require("../utils/api-error");

const checkoutSchema = z.object({
  planId: z.enum(["pro-student", "pro-tutor"]).optional(),
  role: z.enum(["student", "tutor"]).optional(),
  planName: z.string().trim().max(60).optional(),
});

// Never trust the client to choose the price: the signed-in role decides which
// Pro plan is purchasable. A mismatched planId is rejected instead of silently
// charging the wrong amount.
const planConfig = (req) => {
  const expected =
    req.user.role === "tutor" ? "pro-tutor" : req.user.role === "student" ? "pro-student" : null;
  if (!expected) throw ApiError.forbidden("Admins do not need a Pro plan.");

  const requested = req.body.planId || (req.body.role ? `pro-${req.body.role}` : expected);
  if (requested !== expected) {
    throw ApiError.badRequest(
      `Choose the ${expected === "pro-tutor" ? "Pro Tutor" : "Pro Student"} plan for your role.`,
    );
  }

  if (expected === "pro-tutor") {
    return { name: "Pro Tutor", amount: env.stripeTutorAmount, priceId: env.stripeTutorPriceId };
  }
  return { name: "Pro Student", amount: env.stripeStudentAmount, priceId: env.stripeStudentPriceId };
};

const checkout = async (req, res, next) => {
  try {
    checkoutSchema.parse(req.body);
    const plan = planConfig(req);
    const stripe = getStripe();

    const lineItems = plan.priceId
      ? [{ price: plan.priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `${plan.name} — MentorLagbe` },
              unit_amount: plan.amount * 100,
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: req.user.email,
      client_reference_id: req.user._id,
      success_url: `https://mentorlagbe-as-9-server.onrender.com/api/payments/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://mentorlagbe-sigma.vercel.app/payment/cancel`,
      metadata: {
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        planName: plan.name,
      },
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid plan."));
    }
    next(error);
  }
};

// Shared by the webhook and the fallback verification endpoint. Safe to call
// twice: the unique stripeSessionId guard makes fulfillment idempotent.
const fulfill = async (session) => {
  if (session.payment_status !== "paid") return false;

  const existing = await Payment.findOne({ stripeSessionId: session.id });
  if (existing) return false;

  const email = session.metadata?.userEmail || session.customer_details?.email;
  const user = await User.findOne({ email: String(email || "").toLowerCase() });

  await Payment.create({
    userEmail: email || "unknown@mentorlagbe.local",
    userName: user?.name || session.customer_details?.name || "MentorLagbe user",
    userRole: user?.role || session.metadata?.userRole || "student",
    planName: session.metadata?.planName || "Pro Plan",
    amount: (session.amount_total || 0) / 100,
    currency: session.currency || "usd",
    transactionId: session.payment_intent || session.id,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    paidAt: new Date(),
  });

  if (user) user.plan = "pro";
  if (user) await user.save();
  return true;
};

const webhook = async (req, res, next) => {
  try {
    if (!env.stripeWebhookSecret) {
      throw ApiError.serviceUnavailable(
        "STRIPE_WEBHOOK_SECRET is not configured. Upgrade with /api/payments/verify?session_id=... instead.",
      );
    }
    const signature = req.headers["stripe-signature"];
    if (!signature) throw ApiError.badRequest("Missing Stripe signature.");

    const stripe = getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
    } catch (error) {
      throw ApiError.badRequest(`Invalid Stripe signature: ${error.message}`);
    }

    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
      await fulfill(event.data.object);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

const verify = async (req, res, next) => {
  try {
    const schema = z.object({ session_id: z.string().min(1) });
    const { session_id: sessionId } = schema.parse(req.query);
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw ApiError.badRequest("Payment has not completed yet.");
    }
    const activated = await fulfill(session);
    res.json({
      success: true,
      activated,
      message: activated ? "Pro plan is now active." : "Payment was already recorded.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(ApiError.badRequest("Missing session_id."));
    next(error);
  }
};

// Stripe sends the browser here after Checkout. Verifying on this redirect means
// Pro activation does not depend on a webhook secret or on the client calling
// /api/payments/verify. fulfill() is idempotent, so a webhook can also fire.
const returnFromCheckout = async (req, res, next) => {
  try {
    const sessionId = String(req.query.session_id || "");
    if (!sessionId) throw ApiError.badRequest("Missing session_id.");

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res.redirect(302, `https://mentorlagbe-sigma.vercel.app/payment/cancel`);
    }

    await fulfill(session);
    const params = new URLSearchParams({
      plan: session.metadata?.planName || "Pro",
      amount: String((session.amount_total || 0) / 100),
    });
    res.redirect(302, `https://mentorlagbe-sigma.vercel.app/payment/success?${params}`);
  } catch (error) {
    next(error);
  }
};

module.exports = { checkout, webhook, verify, returnFromCheckout };
