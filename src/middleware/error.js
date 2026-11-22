const { ZodError } = require("zod");
const multer = require("multer");
const ApiError = require("../utils/api-error");
const env = require("../config/env");

const notFound = (req, _res, next) => next(new ApiError(404, `No route for ${req.method} ${req.path}.`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, _next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Something went wrong.";
  const details = error.details;

  if (error instanceof ZodError) {
    statusCode = 400;
    message = error.issues[0]?.message || "Invalid request.";
  } else if (error instanceof multer.MulterError) {
    statusCode = 400;
    message = error.code === "LIMIT_FILE_SIZE" ? "Image must be smaller than 5 MB." : error.message;
  } else if (/Only JPG, PNG, WEBP and GIF images/.test(error.message || "")) {
    statusCode = 400;
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${error.path}: ${error.value}.`;
  } else if (error.code === 11000) {
    statusCode = 409;
    message = "That record already exists.";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session expired. Please sign in again.";
  } else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token.";
  }

  // Operational 5xx responses (for example an unconfigured Stripe webhook) are
  // expected, so log them briefly and keep their helpful message for the caller.
  if (statusCode >= 500 && error.isOperational) {
    console.warn(`[warn] ${req.method} ${req.path}: ${message}`);
  } else if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.path}:`, error);
    if (env.isProduction) message = "Internal server error.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
};

module.exports = { notFound, errorHandler };
