const R = require('ramda');
const handlebars = require('handlebars');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { sendEmail, getEmailQuotas } = require('../../apis/ses');
const limiter = require('../../utils/queue');


const getRecipients = ({ to, bcc = [], cc = [] }) => [...to, ...bcc, ...cc];

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

/**
 * Create email object for each recipient. by override the global fields with destination fields
 *
 * @func
 * @since v0.0.0
 * @param {Object} reqBody The object we get from the client after validation
 * @return {Promise<Array<Object>>} destinations
 *
 * @example
 *  Input object:
 *  {
 *      "source": "example@test.com",
 *      "destination": {
 *          "to": ["to_1@test.gg"],
 *          "subject": "TEST {{name}}",
 *          "templateData": { "name": "Amos" }
 *      },
 *      "message": {
 *          "subject": "TEST",
 *          "body": {
 *              "text": "Hello {{name}}",
 *              "html": "Hello {{name}} <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
 *          }
 *      }
 *  }
 *
 *  Output Array:
 *  [{
        "source": "example@test.com",
 *      "to": ["to_1@test.gg"],
 *      "subject": "TEST Amos",
 *      "body": {
 *          "text": "Hello Amos",
 *          "html": "Hello Amos <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
 *      }
 *  }]
 */
const createDestinationsEmail = R.curry(function createDestinationsEmail({ destination, templateBody, message, ...rest }) {
    const createDestination = (templateBody, destination, rest) => {
        //override global fields with local fields
        const compile = template(R.__, R.merge(templateBody, destination.templateData));
        //apply template
        const subject = compile(destination.subject || message.subject);
        return ({
            ...R.omit(["templateData"], destination),
            from: rest.source,
            subject,
            body: R.evolve({ html: compile, text: compile }, message.body)
        });
    };

    if (Array.isArray(destination)) {
        return Promise.resolve(destination.map((destination) => createDestination(templateBody, destination, rest)));
    } else {
        return Promise.resolve([createDestination(templateBody, destination, rest)]);
    }
});


/**
 * Find or create all recipients in the database and, validate that we can send to all of them emails
 * tag the ones that we shouldn't send email to. (unsubscribed, not found, rejected, complaint)
 *
 * @func
 * @since v0.0.0
 * @param {Model} Subscriber - Subscriber model of sequelize
 * @param {String} orgId - the org id
 * @param {Object} sendAction - the send action object with all the details we need to send the emails
 * @return {Promise<Object>} SendAction
 */
const validateSubscribersInDestinations = R.curry(function validateSubscribersInDestinations(Subscriber, orgId, sendAction) {
    const findOrCreateSubscriber = ({ email, orgId }) => {
        //TODO: Promise warning from bluebird https://github.com/sequelize/sequelize/issues/4883
        return Subscriber.findOrCreate({ where: { email, orgId } })
            .then(subscriber => subscriber[0].get({ plain: true }));
    };

    return Promise
        .all(
            R.flatten(sendAction.destinations.map(getRecipients))
                .map((email) => findOrCreateSubscriber({ email, orgId }))
        )
        .then(tagUnsubscribed(sendAction));
});

/**
 * Tag the subscribers that are unsubscribed.
 *
 * @private
 * @func
 * @since v0.0.0
 * @param {Object} sendAction - the send action object with all the details we need to send the emails
 * @param {Array} subscribers - list of subscribers we query from our database
 * @return {Promise<Object>} SendAction
 */
const tagUnsubscribed = R.curry(function tagUnsubscribed(sendAction, subscribers) {
    //we need to filter out subscribers that are opt out
    const unsubscribed = subscribers
        .filter((subscriber) => !subscriber.subscribed)
        .map((subscriber) => subscriber.email);

    const taggedDestinations = sendAction.destinations
        .map((destination) => ({
            ...destination,
            validated: !R.contains(unsubscribed, getRecipients(destination))
        }));

    return Promise.resolve({
        ...sendAction,
        destinations: taggedDestinations
    });
});

/**
 * Validate we can send emails to all recipients with SES.
 *
 * @func
 * @since v0.0.0
 * @param {Object} SES - SES object
 * @param {Array} destinations - list of destinations we want to send email to.
 * @return {Promise<Object>} SendAction
 */
const validateSESQuotes = R.curry(function validateSESQuotes(SES, destinations) {
    const totalRecipients = R.flatten(destinations.map(getRecipients)).length;
    return getEmailQuotas(SES)
        .then(({ Max24HourSend, SentLast24Hours, MaxSendRate, AvailableToday }) => {
            if (AvailableToday < totalRecipients - 10) {
                //TODO: change this error message to something more informative and we need to send email or notification to the sender
                console.error(`YOU WILL REACH THE MAX SEND RATE TODAY IN ${AvailableToday} EMAILS`);
            } else if (AvailableToday < totalRecipients) {
                throw new Error(`YOU REACH THE MAX SEND RATE TODAY`);
            }

            return ({
                destinations,
                meta: {
                    maxSendRate: Number(process.env.DEV_SEND_RATE) || MaxSendRate // No. of email we can send p/s as established by Amazon
                }
            });
        });
});


/**
 * Create activities for destinations in the database
 *
 * @func
 * @since v0.0.0
 * @param {Model} Activity - Activity model of sequelize
 * @param {Object} temp
 * @param {String} temp.apiKeyUUID - api key of the org
 * @param {String} temp.orgId - org id
 * @param {Object} sendAction - the send action object with all the details we need to send the emails
 * @return {Promise<Object>} SendAction
 */
const bulkCreateActivities = R.curry((Activity, { apiKeyUUID, orgId }, sendAction) => {
    const activities = sendAction.destinations.map(destination => ({ ...destination, apiKeyUUID, orgId }));
    return Activity
        .bulkCreate(activities)
        .then(R.map((activity) => activity.get({ plain: true })))
        .then((activities) => {
            return ({
                ...sendAction,
                destinations: R.zipWith(
                    (destination, activity) => ({ ...destination, trackingId: activity.trackingId }),
                    sendAction.destinations,
                    activities
                )
            });
        });
});

/**
 * Update activities message id in database
 *
 * @func
 * @since v0.0.0
 * @param {Model} Activity - Activity model of sequelize
 * @param {Array} emails - sent emails AWS SES object
 * @return {Promise<Object>} activates
 */
const updateActivitiesWithMessageId = R.curry((Activity, emails) => {
    return Activity
        .findAll({ where: { trackingId: { [Op.in]: R.pluck('trackingId')(emails) } } })
        .then(activities => {
            return Promise.all(activities.map((activity) => {
                activity.update({
                    messageId: R.find(R.propEq('trackingId', activity.trackingId))(emails).messageId
                });
            }));
        });
});

/**
 * Apply analytic functions to emails
 *
 * @func
 * @since v0.0.0
 * @param {Array} analyticsFunctions - analytic functions
 * @param {Object} sendAction - the send action object with all the details we need to send the emails
 * @return {Promise<Object>} sendAction
 */
const applyAnalytics = R.curry(function applyAnalytics(analyticsFunctions, sendAction) {
    return ({
        ...sendAction,
        destinations: sendAction.destinations.map(({ body, trackingId, ...rest }) => ({
            ...rest,
            body: analyticsFunctions ? R.compose(...analyticsFunctions)({ ...body, trackingId }) : body
        }))
    });
});

/**
 * Wrap sendEmail function with limiter to control the rate of emails we send
 *
 * @func
 * @since v0.0.0
 * @param {Object} SES - SES object
 * @param {Object} sendAction - the send action object with all the details we need to send the emails
 * @return {Promise<Object>} sendAction
 */
const createSendFn = R.curry(function createSendFn(SES, sendAction) {
    const TIME_SEND = (1 / sendAction.maxSendRate) * 1000; //ms
    limiter.updateSettings({ maxConcurrent: sendAction.maxSendRate, minTime: TIME_SEND }); //use Bottleneck to control the rate of emails sends
    return ({
        ...sendAction,
        meta: {
            ...sendAction.meta,
            action: { limiter, sendEmail: limiter.wrap(sendEmail(SES)) }
        }
    });
});

const template = R.curry(function template(source, data) {
    let template = handlebars.compile(source);
    const string = template(data);
    return string;
});


module.exports = {
    validateRequestBody,
    createDestinationsEmail,
    validateSESQuotes,
    validateSubscribersInDestinations,
    bulkCreateActivities,
    updateActivitiesWithMessageId,
    applyAnalytics,
    createSendFn,

    /*TEST EXPORTS*/
    template
};