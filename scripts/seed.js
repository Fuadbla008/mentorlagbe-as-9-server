// Idempotent demo seed. Clears the four domain collections plus BetterAuth's
// auth tables, then recreates the connected dataset used by the demo frontend.
const env = require("../src/config/env");
const { connect, disconnect, mongoose } = require("../src/db/mongoose");
const { initAuth, getAuth, closeAuth } = require("../src/config/better-auth");
const User = require("../src/models/user.model");
const Tuition = require("../src/models/tuition.model");
const Application = require("../src/models/application.model");
const Payment = require("../src/models/payment.model");
const seed = require("./seed-data");

async function run() {
  if (!env.seedAdminPassword || !env.seedUserPassword) {
    throw new Error("Set SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD in .env before seeding.");
  }

  await connect();
  const auth = await initAuth();
  const db = mongoose.connection.db;

  await Promise.all(
    ["users", "sessions", "accounts", "verifications", "tuitions", "applications", "payments"].map((name) =>
      db.collection(name).deleteMany({}),
    ),
  );

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
    usersByEmail.set(item.email, created);
  }

  const tuitionIds = new Map();
  for (const item of seed.tuitions) {
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

  await Application.insertMany(
    seed.applications.map((item) => ({
      ...item,
      _id: new mongoose.Types.ObjectId(),
      tuitionId: tuitionIds.get(item.tuitionId),
      appliedAt: new Date(item.appliedAt),
    })),
  );

  await Payment.insertMany(
    seed.payments.map((item) => ({
      ...item,
      _id: new mongoose.Types.ObjectId(),
      paidAt: new Date(item.paidAt),
    })),
  );

  console.log(
    `Seeded ${usersByEmail.size} users, ${tuitionIds.size} tuitions, ${seed.applications.length} applications and ${seed.payments.length} payments.`,
  );
  console.log(`Admin login: ${seed.users.find((item) => item.role === "admin")?.email}`);
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
