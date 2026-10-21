'use strict';

const { AppError } = require('../utils/errors');

/** Validates req.body against a zod schema and replaces it with the parsed (typed, trimmed) value. */
function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new AppError(400, 'VALIDATION_ERROR', 'The request contains invalid data', details));
    }
    req.body = result.data;
    return next();
  };
}

module.exports = { validateBody };
