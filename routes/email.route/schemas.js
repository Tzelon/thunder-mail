const Joi = require('joi');

const sendEmailSchema = Joi.object().keys({
    source: Joi.string().email().required(),
    destination: Joi.object().keys({
        to: Joi.array().items(Joi.string()).required().max(50),
        cc: Joi.array().items(Joi.string()).max(50),
        bcc: Joi.array().items(Joi.string()).max(50),
        subject: Joi.string(),
        templateData: Joi.object()
    }).required(),
    templateData: Joi.object(),
    replyTo: Joi.string(),
    returnPath: Joi.string(),
    message: Joi.object().keys({
        subject: Joi.string().required(),
        body: Joi.object().keys({
            text: Joi.string(),
            html: Joi.string()
        }).or('text', 'html')
    })
});

module.exports = sendEmailSchema;