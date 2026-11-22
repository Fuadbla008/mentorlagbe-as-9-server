const jwt = require("jsonwebtoken");
const env = require("../config/env");

module.exports = {
  sign(payload) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  },
  verify(token) {
    return jwt.verify(token, env.jwtSecret);
  },
};
