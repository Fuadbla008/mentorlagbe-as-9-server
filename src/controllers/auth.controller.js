const { z } = require("zod");
const ApiError = require("../utils/api-error");
const { getAuth } = require("../config/better-auth");
const User = require("../models/user.model");
const { sign } = require("../utils/jwt");
const { serializeUser } = require("../utils/serialize");

const signUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(6).max(128),
  role: z.enum(["student", "tutor"]),
});

const signInSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const authError = (error) => {
  const status = Number(error.statusCode || error.status) || 400;
  const message = error.body?.message || error.message || "Authentication failed.";
  if (/already exists|already registered/i.test(message)) {
    return ApiError.conflict("An account with this email already exists.");
  }
  if (/invalid|incorrect|not found/i.test(message)) {
    return ApiError.unauthorized("Incorrect email or password.");
  }
  return new ApiError(status >= 400 && status < 500 ? status : 400, message);
};

const issueToken = (user) =>
  sign({ id: String(user._id), email: user.email, role: user.role, plan: user.plan });

const signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = signUpSchema.parse(req.body);
    const auth = getAuth();
    const image = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;
    const result = await auth.api.signUpEmail({ body: { name, email, password, role, image } });

    let user = await User.findById(result.user?.id).lean();
    if (!user) {
      // Covers a stale DB where the BetterAuth user row was removed but the
      // email/password account still exists, and keeps signup resilient.
      const { hashPassword } = await import("better-auth/crypto");
      user = await User.create({
        name,
        email,
        role,
        image,
        passwordHash: await hashPassword(password),
      });
    }

    res.status(201).json({
      success: true,
      message: "Account created. Welcome to MentorLagbe!",
      token: issueToken(user),
      user: serializeUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid signup details."));
    }
    next(authError(error));
  }
};

const signin = async (req, res, next) => {
  try {
    const { email, password } = signInSchema.parse(req.body);
    let user = null;

    try {
      const result = await getAuth().api.signInEmail({ body: { email, password } });
      user = await User.findById(result.user?.id).lean();
    } catch (authFailure) {
      const { verifyPassword } = await import("better-auth/crypto");
      const candidate = await User.findOne({ email }).select("+passwordHash").lean();
      if (!candidate?.passwordHash || !(await verifyPassword({ hash: candidate.passwordHash, password }))) {
        throw authFailure;
      }
      user = candidate;
    }

    if (!user) throw ApiError.unauthorized("Incorrect email or password.");

    res.json({
      success: true,
      message: `Welcome back, ${user.name.split(" ")[0]}!`,
      token: issueToken(user),
      user: serializeUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(ApiError.badRequest(error.issues[0]?.message || "Invalid signin details."));
    }
    next(authError(error));
  }
};

const signout = (_req, res) => {
  // The API uses stateless JWTs, so the client is responsible for discarding it.
  res.json({ success: true, message: "Signed out." });
};

const me = (req, res) => res.json({ success: true, user: req.user });

module.exports = { signup, signin, signout, me };
