const { MongoClient } = require("mongodb");
const env = require("./env");

let auth = null;
let client = null;
let nodeHandler = null;

async function initAuth() {
  if (auth) return auth;

  const { betterAuth } = await import("better-auth");
  const { mongodbAdapter } = await import("better-auth/adapters/mongodb");
  const nodeIntegration = await import("better-auth/node");

  client = new MongoClient(env.mongoUri);
  await client.connect();
  const db = client.db();

  auth = betterAuth({
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
    trustedOrigins: env.corsOrigins,
    database: mongodbAdapter(db, { client, transaction: env.mongoTransactions }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      maxPasswordLength: 128,
      requireEmailVerification: false,
    },
    user: {
      modelName: "users",
      additionalFields: {
        role: { type: "string", defaultValue: "student", required: false },
        phone: { type: "string", defaultValue: "", required: false },
        bio: { type: "string", defaultValue: "", required: false },
        plan: { type: "string", defaultValue: "free", required: false },
      },
    },
    session: { modelName: "sessions", expiresIn: 60 * 60 * 24 * 7 },
    account: { modelName: "accounts" },
    verification: { modelName: "verifications" },
  });

  nodeHandler = nodeIntegration.toNodeHandler(auth);
  return auth;
}

function getAuth() {
  if (!auth) throw new Error("BetterAuth has not been initialized. Call initAuth() first.");
  return auth;
}

function getNodeHandler() {
  return nodeHandler;
}

async function closeAuth() {
  if (client) await client.close();
  auth = null;
  client = null;
  nodeHandler = null;
}

module.exports = { initAuth, getAuth, getNodeHandler, closeAuth };
