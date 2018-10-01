const R = require('ramda');

/**
 * @description send email using SES
 * @param ses
 * @param params
 * @return {Promise}
 */
const sendEmail = R.curry((ses, params) => {
    const email = {
        Source: params.from, //`"${campaignInfo.fromName}" <${campaignInfo.fromEmail}>`, // TODO: CHANGE TO THIS FORMAT
        Destination: {
            ToAddresses: [`<${params.to}>`] // Email address/addresses that you want to send your email
        },
        ConfigurationSetName: 'thunder-mail',
        ReturnPath: process.env.SES_EMAIL_ADDRESS,
        Message: {
            Body: {
                Html: {
                    // HTML Format of the email
                    Charset: "UTF-8",
                    Data: params.body.html
                },
                Text: {
                    Charset: "UTF-8",
                    Data: params.body.text
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: params.subject
            }
        }

    };

    return ses.sendEmail(email).promise()
        .then(value => ({ messageId: value.MessageId, trackingId: params.trackingId }));
});

const getEmailQuotas = (ses) => {
    return ses.getSendQuota().promise()
        .then((value) => {
            const { Max24HourSend, SentLast24Hours, MaxSendRate } = value;
            // If the user's max send rate is 1, they are in sandbox mode.
            // We should let them know
            if (MaxSendRate <= 1 && process.env.NODE_ENV === "production") {
                throw new Error('You are currently in Sandbox Mode. Please contact Amazon to get this lifted.');
            }
            return { Max24HourSend, SentLast24Hours, MaxSendRate, AvailableToday: (Max24HourSend - SentLast24Hours) };
        });
};


module.exports = {
    sendEmail,
    getEmailQuotas
};