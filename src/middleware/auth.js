const ApiError = require("../utils/api-error");
const { verify } = require("../utils/jwt");
const User = require("../models/user.model");
const { serializeUser } = require("../utils/serialize");

function verifyToken(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized());

  try {
    const payload = verify(token);
    if (!payload.id) return next(ApiError.unauthorized());
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
}

// The token is signed at login, but the database remains the source of truth
// for role and plan so an old token cannot keep admin rights after a demotion.
async function loadUser(req, _res, next) {
  try {
    const user = await User.findById(req.auth.id).lean();
    if (!user) return next(ApiError.unauthorized("This account no longer exists."));
    req.user = serializeUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

const requireAuth = [verifyToken, loadUser];

const roleGuard = (role) => [
  ...requireAuth,
  (req, _res, next) =>
    req.user.role === role
      ? next()
      : next(ApiError.forbidden(`This action requires the ${role} role.`)),
];

module.exports = {
  verifyToken,
  loadUser,
  requireAuth,
  verifyStudent: roleGuard("student"),
  verifyTutor: roleGuard("tutor"),
  verifyAdmin: roleGuard("admin"),
};
