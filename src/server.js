const env = require("./config/env");
const createApp = require("./app");
const { connect, disconnect } = require("./db/mongoose");
const { initAuth, closeAuth } = require("./config/better-auth");

async function start() {
  await connect();
  await initAuth();
  console.log(`[mongo] connected to ${env.mongoUri.replace(/\/\/[^@]+@/, "//***@")}`);

  const server = createApp().listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, closing server...`);
    server.close(async () => {
      await closeAuth();
      await disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
