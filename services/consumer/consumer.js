require('dotenv').config();
const AWS = require('aws-sdk');
const Consumer = require('sqs-consumer');
const { org: Org, activity: Activity } = require('../../db/models');

module.exports = {
    start,
    stop,
    restart
};

let started = false;
let consumers = [];

function start() {
    if (!started) {
        started = true;
        console.debug('Starting feedback consumers');
        setupConsumers();
    } else {
        console.debug('Consumers already started, ignoring start call');
    }
}

function stop() {
    console.debug(`Stopping ${consumers.length} consumers`);
    consumers.forEach(consumer => {
        consumer.stop();
    });
    consumers = [];
    started = false;
}

function restart() {
    stop();
    start();
}

function setupConsumers() {
    return Org.findAll()
        .then(orgs => {
            console.log(`Found ${orgs.length} organizations`);
            orgs.forEach(org => {
                console.log(`Initialising a consumer using AWS access key: ${org.amazonSESAccessKeyId} with the queue URL:  ${org.amazonSQSUrl}`);
                try {
                    consumers.push(createConsumer(org.amazonSESRegion, org.amazonSESAccessKeyId, org.amazonSESSecretAccessKey, org.amazonSQSUrl));
                } catch (e) {
                    console.log(`Org ${org.id} has invalid settings, skipping consumer creation. Error: ${e}`);
                }
            });

            console.log(`Starting ${consumers.length} consumers`);
            consumers.forEach(consumer => {
                consumer.start();
                consumer.on('error', err => {
                    console.debug(`Error event: ${err.message}`);
                });
            });
        })
        .catch(err => {
            throw err;
        });
}

function createConsumer(region, accessKeyId, secretAccessKey, queueUrl) {
    // Create a consumer that processes email feedback notifications from an SQS queue
    return Consumer.create({
        queueUrl,
        batchSize: 10,
        handleMessage: receiveMessageCallback,
        sqs: new AWS.SQS({ accessKeyId, secretAccessKey, region })
    });
}

function receiveMessageCallback(message, done) {
    // Extract the SES email feedback notification
    // See example data structure: https://docs.aws.amazon.com/ses/latest/DeveloperGuide/notification-examples.html
    const notification = JSON.parse(JSON.parse(message.Body).Message);

    // Check that the notification is valid
    if (notification && notification.eventType && notification.mail && notification.mail.messageId) {
        // we want to save the history of the email so we can track it
        let historyRow = { status: '', date: '', meta: '' };
        switch (notification.eventType) {

            case "Send":
                historyRow = {
                    status: 'send',
                    date: notification.mail.timestamp
                };
                break;

            case "Delivery":
                historyRow = {
                    status: 'delivery',
                    date: notification.delivery.timestamp,
                    meta: {
                        processingTimeMillis: notification.delivery.processingTimeMillis,
                        smtpResponse: notification.delivery.smtpResponse,
                        reportingMTA: notification.delivery.reportingMTA
                    }
                };
                break;

            case "Reject":
                historyRow = {
                    status: 'reject',
                    date: new Date(),
                    meta: {
                        reason: notification.reject.reason
                    }
                };
                break;

            case "Bounce":
                historyRow = {
                    status: 'bounce',
                    date: notification.bounce.timestamp,
                    meta: {
                        bounceType: notification.bounce.bounceType,
                        bounceSubType: notification.bounce.bounceSubType
                    }
                };
                break;

            case "Complaint":
                historyRow = {
                    status: 'complaint',
                    date: notification.complaint.timestamp,
                    meta: {
                        userAgent: notification.complaint.userAgent,
                        complaintFeedbackType: notification.complaint.complaintFeedbackType
                    }
                };
                break;

            default:
                return console.error(`consumer message isn't recognize we should handle it ${JSON.stringify(notification)}`);
        }


        Activity
            .findOne({
                where: {
                    messageId: notification.mail.messageId
                }
            })
            .then(activity => {
                if (!activity) return;
                return activity.update({
                    history: [...activity.history, historyRow]
                });
            });
    }

    done();
}

