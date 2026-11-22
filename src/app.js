const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");

const env = require("./config/env");
const apiRoutes = require("./routes");
const { getNodeHandler } = require("./config/better-auth");
const { notFound, errorHandler } = require("./middleware/error");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  // BetterAuth's native endpoints (sessions, email verification, OAuth later).
  // The /api/auth/* bridge below returns the JWT that the Next.js app stores.
  const betterAuthHandler = getNodeHandler();
  if (betterAuthHandler) app.all("/auth/*splat", betterAuthHandler);

  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
