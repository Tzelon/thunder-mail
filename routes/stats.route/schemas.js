const Joi = require('joi');

const statsBySubscriberEmail = Joi.object().keys({
    offset: Joi.number().min(0),
    limit: Joi.number().positive().min(1).max(100),
    fromDate: Joi.date().min('1-1-2011'),
    toDate: Joi.date().min('1-1-2011'),
    groupBy: Joi.string().valid(['day', 'week', 'month'])
});

module.exports = {
    statsBySubscriberEmail
};