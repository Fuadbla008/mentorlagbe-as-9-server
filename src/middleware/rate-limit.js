const ApiError = require("../utils/api-error");

const buckets = new Map();

// Small in-process limiter for auth/upload endpoints. A distributed deployment
// should replace this with Redis, but it prevents casual brute force locally.
module.exports = ({ windowMs = 15 * 60 * 1000, max = 30, message } = {}) => {
  const label = message || "Too many requests. Please try again later.";
  return (req, _res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > max) return next(new ApiError(429, label));
    return next();
  };
};
