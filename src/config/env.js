require("dotenv").config();

const path = require("node:path");

const int = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const list = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

// Production fallbacks keep Stripe and auth redirects on the deployed domains
// even when the optional URL variables were not filled in on the host. Without
// these, Stripe sends the browser to http://localhost:5000/payments/return.
const DEPLOYED_API_URL = "https://mentorlagbe-as-9-server.onrender.com";
const DEPLOYED_CLIENT_URL = "https://mentorlagbe-client.vercel.app";

const isLoopback = (value) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(String(value || "").trim());
const publicUrl = (value, fallback) =>
  value && !(isProduction && isLoopback(value)) ? String(value).replace(/\/$/, "") : fallback;

const betterAuthUrl = publicUrl(
  process.env.BETTER_AUTH_URL,
  isProduction ? DEPLOYED_API_URL : `http://localhost:${int(process.env.PORT, 5000)}`,
);
const clientUrl = publicUrl(process.env.CLIENT_URL, isProduction ? DEPLOYED_CLIENT_URL : "http://localhost:3000");

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  port: int(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI,
  mongoTransactions: process.env.MONGO_TRANSACTIONS === "true",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl,
  // Public URL of this API, used for the Stripe return redirect.
  apiUrl: publicUrl(process.env.API_URL, betterAuthUrl),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl,
  corsOrigins: (() => {
    const configured = list(process.env.CORS_ORIGIN || process.env.CLIENT_URL).filter(
      (origin) => !isProduction || !isLoopback(origin),
    );
    return configured.length ? configured : [clientUrl];
  })(),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripeTutorPriceId: process.env.STRIPE_TUTOR_PRICE_ID,
  stripeStudentPriceId: process.env.STRIPE_STUDENT_PRICE_ID,
  stripeTutorAmount: int(process.env.STRIPE_TUTOR_AMOUNT, 15),
  stripeStudentAmount: int(process.env.STRIPE_STUDENT_AMOUNT, 10),
  imgbbKey: process.env.IMGBB_KEY,
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD,
  seedUserPassword: process.env.SEED_USER_PASSWORD,
  envFile: path.resolve(process.cwd(), ".env"),
};

const required = ["mongoUri", "betterAuthSecret", "jwtSecret"];
// A webhook secret is optional: the Stripe return redirect and
// /api/payments/verify both fulfill a paid session when it is not configured.
const productionOnly = ["stripeSecretKey", "imgbbKey"];
const missing = required.filter((key) => !env[key]);
if (isProduction) missing.push(...productionOnly.filter((key) => !env[key]));

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}. See .env.example.`);
}

if (env.betterAuthSecret.length < 16 || env.jwtSecret.length < 16) {
  throw new Error("BETTER_AUTH_SECRET and JWT_SECRET must each be at least 16 characters.");
}

if (isProduction && !env.stripeWebhookSecret) {
  console.warn("[stripe] STRIPE_WEBHOOK_SECRET is unset; plans are activated on the checkout return redirect instead.");
}

module.exports = Object.freeze(env);
