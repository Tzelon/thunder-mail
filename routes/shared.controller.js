const R = require('ramda');
/**
 * Validate the request body and return it or error
 *
 * @func
 * @since v0.0.0
 * @param {Schema} schema - the schema we want to validate against
 * @param {Object} reqBody The object we get from the client
 * @return {Promise<Object>} reqBody
 */
const validateRequestBody = R.curry(function validateRequestBody(schema, reqBody) {
    const { error, value } = schema.validate(reqBody);
    if (error) return Promise.reject(error);
    return Promise.resolve(value);
});

module.exports = {
    validateRequestBody
};