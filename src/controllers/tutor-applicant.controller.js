const { z } = require("zod");
const Application = require("../models/application.model");
const ApiError = require("../utils/api-error");
const { serializeApplication } = require("../utils/serialize");

const statusSchema = z.object({ status: z.enum(["accepted", "rejected"]) });

const incoming = async (req, res, next) => {
  try {
    const applications = await Application.find({ tutorEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .lean();
    res.json(applications.map(serializeApplication));
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const application = await Application.findOne({
      _id: req.params.id,
      tutorEmail: req.user.email,
    });
    if (!application) throw ApiError.notFound("Application not found.");

    application.status = status;
    await application.save();

    res.json({
      success: true,
      message: `Application ${status}.`,
      application: serializeApplication(application),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid status."));
    }
    if (error.name === "CastError") return next(ApiError.notFound("Application not found."));
    next(error);
  }
};

module.exports = { incoming, updateStatus };
