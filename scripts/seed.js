// Idempotent demo seed. Clears the four domain collections plus BetterAuth's
// auth tables, then recreates the connected dataset used by the demo frontend.
// Safe to rerun: counts are verified after every write.
const env = require("../src/config/env");
const { connect, disconnect, mongoose } = require("../src/db/mongoose");
const { initAuth, getAuth, closeAuth } = require("../src/config/better-auth");
const User = require("../src/models/user.model");
const Tuition = require("../src/models/tuition.model");
const Application = require("../src/models/application.model");
const Payment = require("../src/models/payment.model");
const seed = require("./seed-data");

const COLLECTIONS = ["users", "sessions", "accounts", "verifications", "tuitions", "applications", "payments"];

async function assertCount(name, expected) {
  const actual = await mongoose.connection.db.collection(name).countDocuments();
  if (actual !== expected) throw new Error(`Seed check failed: ${name} has ${actual}, expected ${expected}.`);
}

async function run() {
  if (!env.seedAdminPassword || !env.seedUserPassword) {
    throw new Error("Set SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD in .env before seeding.");
  }
  if (/^REPLACE_ME/.test(env.seedAdminPassword) || /^REPLACE_ME/.test(env.seedUserPassword)) {
    throw new Error("Replace the seed password placeholders in .env before seeding.");
  }

  await connect();
  await initAuth();
  const auth = getAuth();

  for (const name of COLLECTIONS) {
    await mongoose.connection.db.collection(name).deleteMany({});
  }
  console.log(`[seed] cleared ${COLLECTIONS.length} collections in ${mongoose.connection.db.databaseName}`);

  const usersByEmail = new Map();
  for (const item of seed.users) {
    const password = item.role === "admin" ? env.seedAdminPassword : env.seedUserPassword;
    await auth.api.signUpEmail({
      body: {
        name: item.name,
        email: item.email,
        password,
        role: item.role,
        plan: item.plan,
        phone: item.phone,
        bio: item.bio,
        image: item.image,
      },
    });
    const created = await User.findOneAndUpdate(
      { email: item.email.toLowerCase() },
      {
        role: item.role,
        plan: item.plan,
        phone: item.phone,
        bio: item.bio,
        image: item.image,
        emailVerified: true,
      },
      { new: true, upsert: true },
    ).lean();
    if (!created) throw new Error(`Could not create seeded user ${item.email}.`);
    usersByEmail.set(item.email, created);
  }
  await assertCount("users", seed.users.length);

  const tuitionIds = new Map();
  for (const item of seed.tuitions) {
    const tutor = usersByEmail.get(item.tutorEmail);
    if (!tutor) throw new Error(`Seed tuition ${item._id} references unknown tutor ${item.tutorEmail}.`);
    const created = await Tuition.create({
      title: item.title,
      subject: item.subject,
      classLevel: item.classLevel,
      mode: item.mode,
      location: item.location,
      monthlyFee: item.monthlyFee,
      daysPerWeek: item.daysPerWeek,
      bannerImage: item.bannerImage,
      description: item.description,
      tutorName: item.tutorName,
      tutorEmail: item.tutorEmail,
      tutorImage: item.tutorImage,
      approvalStatus: item.approvalStatus,
      isActive: item.isActive,
      rating: item.rating || 0,
      totalStudents: item.totalStudents || 0,
      createdAt: new Date(item.createdAt),
    });
    tuitionIds.set(item._id, created._id);
  }
  await assertCount("tuitions", seed.tuitions.length);

  const applications = seed.applications.map((item) => {
    const tuitionId = tuitionIds.get(item.tuitionId);
    if (!tuitionId) throw new Error(`Seed application ${item._id} references unknown tuition ${item.tuitionId}.`);
    return { ...item, _id: new mongoose.Types.ObjectId(), tuitionId, appliedAt: new Date(item.appliedAt) };
  });
  await Application.insertMany(applications, { ordered: true });
  await assertCount("applications", seed.applications.length);

  const payments = seed.payments.map((item) => ({
    ...item,
    _id: new mongoose.Types.ObjectId(),
    paidAt: new Date(item.paidAt),
  }));
  await Payment.insertMany(payments, { ordered: true });
  await assertCount("payments", seed.payments.length);

  console.log(
    `[seed] done: ${usersByEmail.size} users, ${tuitionIds.size} tuitions, ${applications.length} applications, ${payments.length} payments.`,
  );
  console.log(`[seed] admin login: ${seed.users.find((item) => item.role === "admin")?.email}`);
}

run()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeAuth();
    await disconnect();
  });
