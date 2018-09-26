const R = require('ramda');
const handlebars = require('handlebars');
const { subscriber: Subscriber, activity: Activity, Sequelize } = require('../../db/models');
const Op = Sequelize.Op;
const { sendEmail, getEmailQuotas } = require('../../apis/ses');
const limiter = require('../../utils/queue');


const getRecipients = ({ to, bcc = [], cc = [] }) => [...to, ...bcc, ...cc];

/**
 * @description findOrCreate subscribers from destinations array
 * @param {Array} destinations
 * @param {String} orgId
 * @return {Promise}
 */
const findOrCreateSubscribers = (destinations, orgId) => {
    return Promise.all(
        R.flatten(destinations.map(getRecipients)).map((email) =>
            findOrCreateSubscriber(Subscriber, { email, orgId }))
    );
};

/**
 * @description CURRY - find or create subscriber in the database
 * @param {Subscriber} Subscriber - subscriber model
 * @param {String} email - subscriber email
 * @param {String} orgId - subscriber orgId
 * @return {Object} plain subscriber object from our database
 */
const findOrCreateSubscriber = R.curry((Subscriber, { email, orgId }) => {
    //TODO: Promise warning from bluebird https://github.com/sequelize/sequelize/issues/4883
    return Subscriber.findOrCreate({ where: { email, orgId } })
        .then(subscriber => subscriber[0].get({ plain: true }));
});

/**
 * @description CURRY - create activity for subscribers in the database
 * @param {Activity} Activity - Activity model
 * @param {Array} subscribers - list of subscriber
 * @param {String} from - from where the emails was sent
 * @param {String} subject - subject of the email
 * @param {String} apiKeyUUID - api key of the org
 * @param {String} orgId - org
 * @return {Array} plain activity object from the database
 */
const bulkCreateActivities = R.curry((Activity, destinations, { from, apiKeyUUID, orgId }) => {
    return Activity
        .bulkCreate(
            R.flatten(
                destinations
                    .map(destination => {
                        const subject = template(destination.subject, destination.templateData);
                        return getRecipients(destination)
                            .map((recipient) => ({
                                recipient,
                                subject,
                                from,
                                apiKeyUUID,
                                orgId
                            }));
                    })))
        .then(activities => activities.map((activity) => activity.get({ plain: true })));
});

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
 * @description CURRY - wrap the email body with analytics
 * @param {Array} activities - list of activities
 * @param {String} emailBody - the email we are going to send to each email
 * @param {Function} orgId - analytic function we want to wrap our email with
 * @return {Object} email object with body wrap with analytic
 */
const readyEmailToBeSend = R.curry((activities, email, analyticsFunctions) => {
    return activities.map(activity => ({
        to: activity.recipient,
        cc: activity.cc,
        bcc: activity.bcc,
        from: activity.from,
        subject: activity.subject,
        body: R.compose(...analyticsFunctions)({
            html: template(email.message.body.html, email.destination.templateData),
            text: template(email.message.body.text, email.destination.templateData),
            trackingId: activity.trackingId,
        }),
        trackingId: activity.trackingId
    }));
});

/**
 * @description validate we are not our of quotes
 * @param {SES} SES - ses object
 * @param {Object} destinations
 * @throws Error if we reached the max emails we can send today
 * @return {Number} MaxSendRate how many emails we can send per seconds
 */
const validateEmailQuotes = (SES, destinations) => {
    const totalEmailsNeedToSend = R.flatten(destinations.map(getRecipients)).length;
    return getEmailQuotas(SES)
        .then(({ Max24HourSend, SentLast24Hours, MaxSendRate, AvailableToday }) => {
            if (AvailableToday < totalEmailsNeedToSend - 10) {
                //TODO: change this error message to something more informative and we need to send email or notification to the sender
                console.error(`YOU REACH THE MAX SEND RATE TODAY IN ${AvailableToday} EMAILS`);
            } else if (AvailableToday < totalEmailsNeedToSend) {
                throw new Error(`YOU REACH THE MAX SEND RATE TODAY`);
            }

            return Number(process.env.DEV_SEND_RATE) || MaxSendRate; // No. of email we can send p/s as established by Amazon
        });
};

/**
 * @description wrap sendEmail function with limiter to control the rate of emails we send
 * @param {Number} rateLimit
 * @return {{limiter: module:bottleneck | Bottleneck, sendEmail: *}}
 */
const createSendEmailFunction = (rateLimit) => {
    const TIME_SEND = (1 / rateLimit) * 1000; //ms
    limiter.updateSettings({ maxConcurrent: rateLimit, minTime: TIME_SEND }); //use Bottleneck to control the rate of emails sends
    return { limiter, sendEmail: limiter.wrap(sendEmail) };
};

const template = (source, data) => {
    let template = handlebars.compile(source);
    const string = template(data);
    return string;
};

/**
 * @description we want to override the global params with the destination params,
 * we have only two fields for now subject and templateData TODO: MAKE IS GENERIC FOR ALL FIELDS
 * @param {Object | Array} destination
 * @param {Object} body
 * @return {Array<Object<{templateData, subject}>>} { to, cc, bcc, subject, templateData}
 */
const overrideGlobalFields = (destination, body) => {
    if (Array.isArray(destination)) {
        return destination.map((destination) => {
            const templateData = R.merge(body.templateBody, destination.templateData);
            const subject = destination.subject || body.subject;
            return { ...destination, templateData, subject };
        });
    } else {
        const templateData = R.merge(body.templateBody, destination.templateData);
        const subject = destination.subject || body.subject;
        return [{ ...destination, templateData, subject }];
    }
};

module.exports = {
    findOrCreateSubscriber: findOrCreateSubscriber(Subscriber),
    bulkCreateActivities: bulkCreateActivities(Activity),
    updateActivitiesWithMessageId: updateActivitiesWithMessageId(Activity),
    readyEmailToBeSend,
    findOrCreateSubscribers,
    validateEmailQuotes,
    createSendEmailFunction,
    overrideGlobalFields
};