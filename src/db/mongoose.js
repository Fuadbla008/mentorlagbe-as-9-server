const mongoose = require("mongoose");
const env = require("../config/env");

let connected = false;

async function connect() {
  if (connected) return mongoose.connection;
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 10_000,
  });
  connected = true;
  mongoose.connection.on("error", (error) => console.error("[mongo] connection error:", error.message));
  return mongoose.connection;
}

async function disconnect() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

module.exports = { connect, disconnect, mongoose };
