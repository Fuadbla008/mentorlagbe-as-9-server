const { z } = require("zod");
const Tuition = require("../models/tuition.model");
const Application = require("../models/application.model");
const ApiError = require("../utils/api-error");
const { serializeTuition } = require("../utils/serialize");

const tuitionSchema = z.object({
  title: z.string().trim().min(5).max(160),
  subject: z.string().trim().min(2).max(80),
  classLevel: z.string().trim().min(1).max(80),
  mode: z.enum(["Online", "Offline"]),
  location: z.string().trim().max(160).optional().default(""),
  monthlyFee: z.coerce.number().min(0).max(1_000_000),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  bannerImage: z.string().trim().url().optional().default(""),
  description: z.string().trim().min(20).max(3000),
});

const editable = (payload) => {
  const result = {};
  for (const key of Object.keys(tuitionSchema.shape)) {
    if (payload[key] !== undefined) result[key] = payload[key];
  }
  return result;
};

const ownTuition = async (id, email) => {
  const tuition = await Tuition.findOne({ _id: id, tutorEmail: email });
  if (!tuition) throw ApiError.notFound("Tuition not found.");
  return tuition;
};

const create = async (req, res, next) => {
  try {
    const payload = tuitionSchema.parse(req.body);
    const posted = await Tuition.countDocuments({ tutorEmail: req.user.email });
    if (req.user.plan !== "pro" && posted >= 2) {
      throw ApiError.forbidden("Free tutors can post up to 2 tuitions. Upgrade to Pro for unlimited posts.");
    }

    const tuition = await Tuition.create({
      ...payload,
      tutorName: req.user.name,
      tutorEmail: req.user.email,
      tutorImage: req.user.image,
      approvalStatus: "pending",
      isActive: true,
      rating: 0,
      totalStudents: 0,
    });

    res.status(201).json({
      success: true,
      message: "Tuition submitted for admin approval.",
      tuition: serializeTuition(tuition),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid tuition details."));
    }
    if (error.name === "CastError") return next(ApiError.badRequest("Invalid tuition id."));
    next(error);
  }
};

const mine = async (req, res, next) => {
  try {
    const tuitions = await Tuition.find({ tutorEmail: req.user.email }).sort({ createdAt: -1 }).lean();
    res.json(tuitions.map(serializeTuition));
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const payload = tuitionSchema.partial().parse(req.body);
    const tuition = await ownTuition(req.params.id, req.user.email);
    Object.assign(tuition, editable(payload));
    await tuition.save();

    res.json({
      success: true,
      message: "Tuition updated.",
      tuition: serializeTuition(tuition),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid tuition details."));
    }
    if (error.name === "CastError") return next(ApiError.notFound("Tuition not found."));
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const tuition = await ownTuition(req.params.id, req.user.email);
    await tuition.deleteOne();
    await Application.deleteMany({ tuitionId: tuition._id });
    res.json({ success: true, message: "Tuition deleted." });
  } catch (error) {
    if (error.name === "CastError") return next(ApiError.notFound("Tuition not found."));
    next(error);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const tuition = await ownTuition(req.params.id, req.user.email);
    tuition.isActive = !tuition.isActive;
    await tuition.save();
    res.json({
      success: true,
      message: tuition.isActive ? "Tuition is now active." : "Tuition closed to new applications.",
      tuition: serializeTuition(tuition),
    });
  } catch (error) {
    if (error.name === "CastError") return next(ApiError.notFound("Tuition not found."));
    next(error);
  }
};

module.exports = { create, mine, update, remove, toggleStatus };
