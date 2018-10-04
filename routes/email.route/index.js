const express = require('express');
const R = require('ramda');
const { checkAPIKey } = require('../../middleware');
const { getSES } = require('../../config/aws');
const sendEmailSchema = require('./schemas');
const { activity: Activity, subscriber: Subscriber } = require('../../db/models');
const { insertTrackingPixel, insertUnsubscribeLink, wrapLink } = require('../../apis/analytics');
const { validateRequestBody } = require('../shared.controller');
const {
    bulkCreateActivities, updateActivitiesWithMessageId, createSendFn, applyAnalytics,
    validateSubscribersInDestinations, createDestinationsEmail, validateSESQuotes
} = require('./controller');

const router = express.Router();

router.route('/')
    .post(checkAPIKey, (req, res) => {
        // easy access to org object
        const org = req.org;
        // getting ses object
        const SES = getSES();

        const sendAction = R.pipeP(
            validateRequestBody(sendEmailSchema),
            createDestinationsEmail,
            validateSESQuotes(SES),
            validateSubscribersInDestinations(Subscriber, org.id),
            bulkCreateActivities(Activity, { apiKeyUUID: org.apiKeyUUID, orgId: org.id }),
            applyAnalytics([insertTrackingPixel, insertUnsubscribeLink, wrapLink]),
            createSendFn(SES)
        );


        sendAction(req.body)
            .then((sendAction) => {
                //send the emails
                return Promise.all(sendAction.destinations.map(sendAction.meta.action.sendEmail));
            })
            .then(emails => {
                //update activity
                updateActivitiesWithMessageId(Activity, emails);
                return res.status(202).send(`emails are on their way ${JSON.stringify(emails)}`);
            })
            .catch(reason => {
                console.error(reason);
                return res.status(500).send(`Unable to fulfill your request \n ${reason.message}`);
            });
    });


module.exports = router;