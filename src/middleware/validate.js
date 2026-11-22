const ApiError = require("../utils/api-error");

module.exports = (schema, source = "body") => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
    return next(ApiError.badRequest(`${field}${issue.message}`));
  }
  req[source] = result.data;
  return next();
};
