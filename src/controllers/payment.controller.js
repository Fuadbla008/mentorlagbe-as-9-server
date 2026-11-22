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

const planConfig = (req) => {
  const requested = req.body.planId || (req.body.role ? `pro-${req.body.role}` : null);
  if (requested === "pro-tutor") {
    return { name: "Pro Tutor", amount: env.stripeTutorAmount, priceId: env.stripeTutorPriceId };
  }
  if (requested === "pro-student") {
    return { name: "Pro Student", amount: env.stripeStudentAmount, priceId: env.stripeStudentPriceId };
  }
  if (req.body.planName) {
    const isTutor = /tutor/i.test(req.body.planName);
    return {
      name: req.body.planName,
      amount: isTutor ? env.stripeTutorAmount : env.stripeStudentAmount,
      priceId: isTutor ? env.stripeTutorPriceId : env.stripeStudentPriceId,
    };
  }
  throw ApiError.badRequest("Choose a Pro plan to continue.");
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
      success_url: `${env.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/payment/cancel`,
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
      throw ApiError.serviceUnavailable("STRIPE_WEBHOOK_SECRET is not configured.");
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

module.exports = { checkout, webhook, verify };
