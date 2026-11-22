const { z } = require("zod");
const User = require("../models/user.model");
const Tuition = require("../models/tuition.model");
const Payment = require("../models/payment.model");
const ApiError = require("../utils/api-error");
const { serializeUser, serializeTuition, serializePayment } = require("../utils/serialize");

const roleSchema = z.object({ role: z.enum(["student", "tutor", "admin"]) });
const approvalSchema = z.object({ approvalStatus: z.enum(["approved", "rejected"]) });

const users = async (_req, res, next) => {
  try {
    const docs = await User.find().sort({ createdAt: -1 }).lean();
    res.json(docs.map(serializeUser));
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const { role } = roleSchema.parse(req.body);
    if (String(req.params.id) === req.user._id && role !== "admin") {
      throw ApiError.forbidden("You cannot remove your own admin role.");
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).lean();
    if (!user) throw ApiError.notFound("User not found.");
    res.json({ success: true, message: "User role updated.", user: serializeUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid role."));
    }
    if (error.name === "CastError") return next(ApiError.notFound("User not found."));
    next(error);
  }
};

const tuitions = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.approvalStatus = String(req.query.status);
    const docs = await Tuition.find(filter).sort({ createdAt: -1 }).lean();
    res.json(docs.map(serializeTuition));
  } catch (error) {
    next(error);
  }
};

const moderate = async (req, res, next) => {
  try {
    const { approvalStatus } = approvalSchema.parse(req.body);
    const tuition = await Tuition.findById(req.params.id);
    if (!tuition) throw ApiError.notFound("Tuition not found.");

    tuition.approvalStatus = approvalStatus;
    tuition.isActive = approvalStatus !== "rejected";
    await tuition.save();

    res.json({
      success: true,
      message: `Tuition ${approvalStatus}.`,
      tuition: serializeTuition(tuition),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid approval status."));
    }
    if (error.name === "CastError") return next(ApiError.notFound("Tuition not found."));
    next(error);
  }
};

const payments = async (_req, res, next) => {
  try {
    const docs = await Payment.find().sort({ paidAt: -1 }).lean();
    res.json(docs.map(serializePayment));
  } catch (error) {
    next(error);
  }
};

const stats = async (_req, res, next) => {
  try {
    const [totalUsers, tutors, pending, approved, revenue] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "tutor" }),
      Tuition.countDocuments({ approvalStatus: "pending" }),
      Tuition.countDocuments({ approvalStatus: "approved" }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    res.json({ totalUsers, tutors, pending, approved, revenue: revenue[0]?.total || 0 });
  } catch (error) {
    next(error);
  }
};

module.exports = { users, updateRole, tuitions, moderate, payments, stats };
