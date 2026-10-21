'use strict';

const { AppError } = require('../utils/errors');

function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

/** Single place that turns any error into the API's JSON error envelope. */
function errorHandler(logger) {
  // Express identifies error middleware by its 4 parameters.
  // eslint-disable-next-line no-unused-vars
  return (error, req, res, next) => {
    if (res.headersSent) return next(error);

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Unexpected error';
    let details;

    if (error instanceof AppError) {
      ({ statusCode: status, code, message, details } = error);
    } else if (error.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'The request body is not valid JSON';
    } else if (error.type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'The request body is too large';
    }

    if (status >= 500) {
      logger.error('Unhandled error', { requestId: req.id, error: error.message, stack: error.stack });
    }

    return res.status(status).json({ error: { code, message, details, requestId: req.id } });
  };
}

module.exports = { notFoundHandler, errorHandler };
