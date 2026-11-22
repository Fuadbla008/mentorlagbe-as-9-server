const { z } = require("zod");
const User = require("../models/user.model");
const ApiError = require("../utils/api-error");
const { serializeUser } = require("../utils/serialize");

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(500).optional(),
  image: z.string().trim().url().optional(),
});

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) throw ApiError.notFound("Account not found.");
    res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const patch = profileSchema.parse(req.body);
    if (!Object.keys(patch).length) throw ApiError.badRequest("Nothing to update.");

    const user = await User.findByIdAndUpdate(req.user._id, patch, {
      new: true,
      runValidators: true,
    }).lean();
    if (!user) throw ApiError.notFound("Account not found.");

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: serializeUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid profile details."));
    }
    next(error);
  }
};

module.exports = { getMe, updateProfile };
