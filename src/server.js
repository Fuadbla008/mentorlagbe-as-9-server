const env = require("./config/env");
const createApp = require("./app");
const { connect, disconnect } = require("./db/mongoose");

async function start() {
  await connect();
  console.log(`[mongo] connected to ${env.mongoUri.replace(/\/\/[^@]+@/, "//***@")}`);

  const server = createApp().listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, closing server...`);
    server.close(async () => {
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
