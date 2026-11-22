const Stripe = require("stripe");
const env = require("./env");
const ApiError = require("../utils/api-error");

let stripe = null;

module.exports = {
  getStripe() {
    if (!env.stripeSecretKey) {
      throw ApiError.serviceUnavailable("Stripe is not configured. Set STRIPE_SECRET_KEY first.");
    }
    if (!stripe) stripe = new Stripe(env.stripeSecretKey);
    return stripe;
  },
};
