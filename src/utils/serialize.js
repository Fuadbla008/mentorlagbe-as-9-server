const toPlain = (value) =>
  value && typeof value.toObject === "function" ? value.toObject({ virtuals: true }) : { ...value };

const stringId = (value) => (value == null ? null : String(value));

const avatarFor = (name, image) => {
  if (image) return image;
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || "MentorLagbe")}`;
};

const serializeUser = (user) => {
  if (!user) return null;
  const raw = toPlain(user);
  const id = stringId(raw._id || raw.id);
  return {
    _id: id,
    id,
    name: raw.name,
    email: raw.email,
    image: avatarFor(raw.name, raw.image),
    role: raw.role || "student",
    phone: raw.phone || "",
    bio: raw.bio || "",
    plan: raw.plan || "free",
    createdAt: raw.createdAt,
  };
};

const serializeTuition = (tuition) => {
  if (!tuition) return null;
  const raw = toPlain(tuition);
  return {
    ...raw,
    _id: stringId(raw._id),
    tutorEmail: raw.tutorEmail,
    createdAt: raw.createdAt,
  };
};

const serializeApplication = (application) => {
  if (!application) return null;
  const raw = toPlain(application);
  return {
    ...raw,
    _id: stringId(raw._id),
    tuitionId: stringId(raw.tuitionId),
    appliedAt: raw.appliedAt,
  };
};

const serializePayment = (payment) => {
  if (!payment) return null;
  const raw = toPlain(payment);
  return { ...raw, _id: stringId(raw._id), paidAt: raw.paidAt };
};

module.exports = { toPlain, serializeUser, serializeTuition, serializeApplication, serializePayment };
