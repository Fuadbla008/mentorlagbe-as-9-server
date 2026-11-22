// Express 5 forwards rejected promises, but keeping this makes intent explicit
// and keeps controllers safe if they are reused in Express 4 tooling.
module.exports = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
