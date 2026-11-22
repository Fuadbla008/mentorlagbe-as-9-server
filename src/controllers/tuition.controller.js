const { z } = require("zod");
const Tuition = require("../models/tuition.model");
const User = require("../models/user.model");
const Application = require("../models/application.model");
const Payment = require("../models/payment.model");
const ApiError = require("../utils/api-error");
const { serializeTuition } = require("../utils/serialize");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  subject: z.string().trim().max(80).optional().default(""),
  classLevel: z.string().trim().max(80).optional().default(""),
  mode: z.enum(["Online", "Offline"]).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(9),
  sort: z.enum(["newest", "fee-low", "fee-high", "rating"]).optional().default("newest"),
});

const publicFilter = { approvalStatus: "approved", isActive: true };

const search = async (req, res, next) => {
  try {
    const query = searchSchema.parse(req.query);
    const filter = { ...publicFilter };

    if (query.q) {
      const needle = escapeRegex(query.q);
      filter.$or = [
        { title: { $regex: needle, $options: "i" } },
        { subject: { $regex: needle, $options: "i" } },
        { description: { $regex: needle, $options: "i" } },
      ];
    }
    if (query.subject) filter.subject = query.subject;
    if (query.classLevel) filter.classLevel = query.classLevel;
    if (query.mode) filter.mode = query.mode;

    const sort =
      query.sort === "fee-low"
        ? { monthlyFee: 1 }
        : query.sort === "fee-high"
          ? { monthlyFee: -1 }
          : query.sort === "rating"
            ? { rating: -1, createdAt: -1 }
            : { createdAt: -1 };

    const total = await Tuition.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    const page = Math.min(Math.max(1, query.page), totalPages);
    const docs = await Tuition.find(filter)
      .sort(sort)
      .skip((page - 1) * query.limit)
      .limit(query.limit)
      .lean();

    res.json({ items: docs.map(serializeTuition), total, totalPages, page });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid search parameters."));
    }
    next(error);
  }
};

const featured = async (req, res, next) => {
  try {
    const limitSchema = z.coerce.number().int().min(1).max(12).optional().default(6);
    const limit = limitSchema.parse(req.query.limit);
    const docs = await Tuition.find(publicFilter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json(docs.map(serializeTuition));
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const tuition = await Tuition.findOne({ _id: req.params.id, ...publicFilter }).lean();
    if (!tuition) throw ApiError.notFound("Tuition not found or no longer available.");
    res.json(serializeTuition(tuition));
  } catch (error) {
    if (error.name === "CastError") return next(ApiError.notFound("Tuition not found."));
    next(error);
  }
};

const stats = async (_req, res, next) => {
  try {
    const [tutors, students, tuitions, applications, revenue] = await Promise.all([
      User.countDocuments({ role: "tutor" }),
      User.countDocuments({ role: "student" }),
      Tuition.countDocuments({ approvalStatus: "approved" }),
      Application.countDocuments({}),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    res.json({
      tutors,
      students,
      tuitions,
      applications,
      revenue: revenue[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { search, featured, getById, stats };
