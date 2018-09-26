const express = require('express');
const R = require('ramda');
const { checkAPIKey } = require('../../middleware');
const { getSES } = require('../../config/aws');
const sendEmailSchema = require('../schemas/sendEmail');
const { insertTrackingPixel, insertUnsubscribeLink, wrapLink } = require('../../apis/analytics');
const {
    bulkCreateActivities, updateActivitiesWithMessageId, overrideGlobalFields,
    readyEmailToBeSend, createSendEmailFunction, validateEmailQuotes, findOrCreateSubscribers
} = require('./controller');

const router = express.Router();

router.route('/')
    .post(checkAPIKey, (req, res) => {

        //validate schema
        const { error, value: reqBody } = sendEmailSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ type: error.name, message: error.message });
        }

        // easy access to org object
        const org = req.org;
        // getting ses object
        const ses = getSES();
        //override the global fields with the destination fields.
        const destinations = overrideGlobalFields(reqBody.destination, reqBody);

        //creating activities for each subscriber in the to,cc,bcc fields and ready the email to be sent.
        const createActivitiesAndReadyEmails = (destinations, reqBody, org) => {
            return findOrCreateSubscribers(destinations, org.id)
                .then((subscribers) => {

                    //we need to filter out subscribers that are opt out
                    const unsubscribed = subscribers.filter((subscriber) => !subscriber.subscribed).map((subscriber) => subscriber.email);
                    const filteredDestination = destinations
                        .map((destination) => ({
                            ...destination,
                            to: R.reject(R.contains(R.__, unsubscribed), destination.to)
                            //TODO: Add CC and BCC filtering
                        }))
                        .filter(destination => destination.to.length !== 0);

                    if (filteredDestination.length === 0) {
                        throw new Error(`There are no destinations or destinations are unsubscribed`);
                    }

                    return bulkCreateActivities(filteredDestination, {
                        from: reqBody.source,
                        apiKeyUUID: org.apiKeyUUID,
                        orgId: org.id
                    });
                })
                .then((activities) => readyEmailToBeSend(activities, reqBody, [insertTrackingPixel, insertUnsubscribeLink, wrapLink]));
        };

        //validate we can send the email to all recipients and wrapping the sendEmail function with rateLimit bottleneck
        const validateQuotesWrapSendEmail = (SES, destinations) => {
            return validateEmailQuotes(SES, destinations)
                .then(createSendEmailFunction);
        };

        Promise
            .all([
                createActivitiesAndReadyEmails(destinations, reqBody, org),
                validateQuotesWrapSendEmail(ses, destinations)
            ])
            .then(([emails, { limiter, sendEmail }]) => {
                //send the emails
                return Promise.all(emails.map((email) => sendEmail(ses, email)));
            })
            .then(emails => {
                //update activity
                updateActivitiesWithMessageId(emails);
                return res.status(202).send(`emails are on their way ${JSON.stringify(emails)}`);
            })
            .catch(reason => {
                console.error(reason);
                return res.status(500).send(`Unable to fulfill your request \n ${reason.message}`);
            });
    });


module.exports = router;