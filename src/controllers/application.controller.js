const { z } = require("zod");
const Application = require("../models/application.model");
const Tuition = require("../models/tuition.model");
const ApiError = require("../utils/api-error");
const { serializeApplication } = require("../utils/serialize");

const applySchema = z.object({
  tuitionId: z.string().min(1),
  studentPhone: z.string().trim().max(30).optional().default(""),
  preferredSchedule: z.string().trim().max(200).optional().default(""),
  studentNote: z.string().trim().max(1000).optional().default(""),
});

const apply = async (req, res, next) => {
  try {
    const payload = applySchema.parse(req.body);
    const tuition = await Tuition.findOne({
      _id: payload.tuitionId,
      approvalStatus: "approved",
      isActive: true,
    }).lean();
    if (!tuition) throw ApiError.notFound("This tuition is not open for applications.");

    const duplicate = await Application.exists({
      tuitionId: tuition._id,
      studentEmail: req.user.email,
    });
    if (duplicate) throw ApiError.conflict("You have already applied to this tuition.");

    const application = await Application.create({
      tuitionId: tuition._id,
      tuitionTitle: tuition.title,
      subject: tuition.subject,
      monthlyFee: tuition.monthlyFee,
      tutorEmail: tuition.tutorEmail,
      studentName: req.user.name,
      studentEmail: req.user.email,
      studentPhone: payload.studentPhone || req.user.phone || "",
      preferredSchedule: payload.preferredSchedule,
      studentNote: payload.studentNote,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Application submitted! The tutor will review it shortly.",
      application: serializeApplication(application),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid application."));
    }
    if (error.code === 11000) {
      return next(ApiError.conflict("You have already applied to this tuition."));
    }
    if (error.name === "CastError") return next(ApiError.badRequest("Invalid tuition id."));
    next(error);
  }
};

const mine = async (req, res, next) => {
  try {
    const applications = await Application.find({ studentEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .lean();
    res.json(applications.map(serializeApplication));
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      studentEmail: req.user.email,
    });
    if (!application) throw ApiError.notFound("Application not found.");
    if (application.status !== "pending") {
      throw ApiError.badRequest("Only pending applications can be cancelled.");
    }
    await application.deleteOne();
    res.json({ success: true, message: "Application cancelled." });
  } catch (error) {
    if (error.name === "CastError") return next(ApiError.notFound("Application not found."));
    next(error);
  }
};

module.exports = { apply, mine, cancel };
