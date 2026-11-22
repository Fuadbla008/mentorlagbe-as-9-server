// Local smoke check. Boots the real Express app against the configured MongoDB,
// exercises the public and protected routes, and confirms the seed data is usable.
// Run `npm run seed` first. No external services (Stripe/ImgBB) are required.
require("dotenv").config();

const { connect, disconnect, mongoose } = require("../src/db/mongoose");
const { initAuth, closeAuth } = require("../src/config/better-auth");
const createApp = require("../src/app");
const seed = require("./seed-data");
const env = require("../src/config/env");

let failures = 0;
let base = "";

function check(name, ok, detail = "") {
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function run() {
  await connect();
  await initAuth();

  const db = mongoose.connection.db;
  const counts = {};
  for (const name of ["users", "tuitions", "applications", "payments"]) {
    counts[name] = await db.collection(name).countDocuments();
  }
  check("MongoDB has seeded users", counts.users >= seed.users.length, `${counts.users}`);
  check("MongoDB has seeded tuitions", counts.tuitions >= seed.tuitions.length, `${counts.tuitions}`);
  check("MongoDB has seeded applications", counts.applications >= seed.applications.length, `${counts.applications}`);
  check("MongoDB has seeded payments", counts.payments >= seed.payments.length, `${counts.payments}`);

  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await request("/api/health");
    check("GET /api/health", health.status === 200 && health.body?.success === true);

    const config = await request("/api/config");
    check(
      "GET /api/config",
      config.status === 200 && config.body?.config?.plans?.tutor?.amount === env.stripeTutorAmount,
    );

    const featured = await request("/api/tuitions/featured");
    check("GET /api/tuitions/featured", featured.status === 200 && Array.isArray(featured.body) && featured.body.length > 0, `${featured.body?.length ?? 0} items`);

    const search = await request("/api/tuitions?q=math&page=1&limit=3");
    check(
      "GET /api/tuitions search + pagination",
      search.status === 200 && Array.isArray(search.body?.items) && Number.isInteger(search.body?.total),
      `total=${search.body?.total ?? "n/a"}`,
    );

    const stats = await request("/api/stats");
    check("GET /api/stats", stats.status === 200 && typeof stats.body?.revenue === "number");

    const guarded = await request("/api/tuitions/mine");
    check("tutor route is protected and ordered first", guarded.status === 401, `status=${guarded.status}`);

    const missing = await request("/api/definitely-not-a-route");
    check("unknown route returns JSON 404", missing.status === 404 && missing.body?.success === false);

    const adminEmail = seed.users.find((item) => item.role === "admin")?.email;
    const signin = await request("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: adminEmail, password: env.seedAdminPassword }),
    });
    const token = signin.body?.token;
    check("POST /api/auth/signin returns a token", signin.status === 200 && Boolean(token), `status=${signin.status}`);

    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      const me = await request("/api/auth/me", { headers });
      check("GET /api/auth/me", me.status === 200 && me.body?.user?.role === "admin");

      const profile = await request("/api/profile", { headers });
      check("GET /api/profile", profile.status === 200 && profile.body?.user?.email === adminEmail);

      const adminStats = await request("/api/admin/stats", { headers });
      check("GET /api/admin/stats", adminStats.status === 200 && adminStats.body?.totalUsers >= seed.users.length);

      const adminUsers = await request("/api/admin/users", { headers });
      check("GET /api/admin/users", adminUsers.status === 200 && Array.isArray(adminUsers.body) && adminUsers.body.length >= seed.users.length);

      const forbidden = await request("/api/applications", {
        method: "POST",
        headers,
        body: JSON.stringify({ tuitionId: "000000000000000000000000" }),
      });
      check("student-only route rejects admin", forbidden.status === 403, `status=${forbidden.status}`);

      const adminCheckout = await request("/api/payments/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ planId: "pro-student" }),
      });
      check("admin cannot buy a Pro plan", adminCheckout.status === 403, `status=${adminCheckout.status}`);
    }

    // Graceful degradation when optional integrations are not configured.
    const checkout = await request("/api/payments/checkout", {
      method: "POST",
      body: "{}",
    });
    check("unauthenticated checkout is rejected", checkout.status === 401, `status=${checkout.status}`);

    const webhook = await request("/payments/webhook", { method: "POST", body: "{}" });
    check("webhook fails clearly without a secret", webhook.status === 503, `status=${webhook.status}`);

    const returned = await request("/api/payments/return");
    check("checkout return validates session_id", returned.status === 400, `status=${returned.status}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  await closeAuth();
  await disconnect();

  if (failures) {
    console.error(`\nSmoke check failed: ${failures} check(s) did not pass.`);
    process.exitCode = 1;
  } else {
    console.log("\nSmoke check passed. The API is ready for local use.");
  }
}

run().catch(async (error) => {
  console.error("Smoke check crashed:", error);
  try {
    await closeAuth();
    await disconnect();
  } catch {
    // ignore cleanup errors during a failed run
  }
  process.exitCode = 1;
});
