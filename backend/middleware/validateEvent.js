const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const eventSchema = require("../../schema/event.schema.json");

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const validateEvent = ajv.compile(eventSchema);

function validateEventBody(req, res, next) {
  const valid = validateEvent(req.body);

  if (valid) {
    return next();
  }

  return res.status(400).json({
    error: "Validation failed",
    details: validateEvent.errors,
  });
}

module.exports = validateEventBody;
