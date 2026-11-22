const { z } = require("zod");
const User = require("../models/user.model");
const Tuition = require("../models/tuition.model");
const ApiError = require("../utils/api-error");
const { serializeTuition } = require("../utils/serialize");

const bookmarkSchema = z.object({ tuitionId: z.string().min(1) });

const mine = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) throw ApiError.notFound("Account not found.");
    const ids = (user.bookmarks || []).map((item) => item.tuitionId);
    const tuitions = await Tuition.find({ _id: { $in: ids } }).lean();
    res.json(tuitions.map(serializeTuition));
  } catch (error) {
    next(error);
  }
};

const toggle = async (req, res, next) => {
  try {
    const { tuitionId } = bookmarkSchema.parse(req.body);
    const tuition = await Tuition.findOne({ _id: tuitionId, approvalStatus: "approved", isActive: true })
      .select("_id")
      .lean();
    if (!tuition) throw ApiError.notFound("Tuition not found.");

    const user = await User.findById(req.user._id);
    if (!user) throw ApiError.notFound("Account not found.");

    const index = user.bookmarks.findIndex((item) => String(item.tuitionId) === String(tuitionId));
    let saved;
    if (index >= 0) {
      user.bookmarks.splice(index, 1);
      saved = false;
    } else {
      if (user.plan !== "pro" && user.bookmarks.length >= 5) {
        throw ApiError.forbidden("Free students can save up to 5 tuitions. Upgrade to Pro for unlimited saves.");
      }
      user.bookmarks.push({ tuitionId: tuition._id });
      saved = true;
    }
    await user.save();

    res.json({
      success: true,
      message: saved ? "Saved to your bookmarks." : "Removed from saved tuitions.",
      saved,
      bookmarks: user.bookmarks.map((item) => String(item.tuitionId)),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid tuition id."));
    }
    if (error.name === "CastError") return next(ApiError.notFound("Tuition not found."));
    next(error);
  }
};

module.exports = { mine, toggle };
