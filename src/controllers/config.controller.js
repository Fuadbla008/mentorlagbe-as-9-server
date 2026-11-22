const env = require("../config/env");

// Public, non-secret values only. The client can use this instead of hardcoding
// a Stripe publishable key or guessing whether webhook fulfillment is active.
const getConfig = (_req, res) => {
  res.json({
    success: true,
    config: {
      stripePublishableKey: env.stripePublishableKey,
      plans: {
        student: { id: "pro-student", amount: env.stripeStudentAmount, currency: "usd" },
        tutor: { id: "pro-tutor", amount: env.stripeTutorAmount, currency: "usd" },
      },
      uploadEnabled: Boolean(env.imgbbKey && !env.imgbbKey.startsWith("REPLACE_ME")),
      webhookEnabled: Boolean(env.stripeWebhookSecret),
    },
  });
};

module.exports = { getConfig };
