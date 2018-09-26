/**
 * AWS SES have two ways to follow events, account level or specific email.
 * we use specific email notification as it gives us more information on the email status.
 * Specific Email Events: Send, Reject, Bounce, Complaint, Delivery, Open, Click, Rendering Failure
 * Account Level Events: Bounce, Complaint, Delivery
 *
 * NOTE! we have custom implementation for Open and Click events, TODO: Why not use AWS implementation ?
 */

const AWS = require("aws-sdk");
const R = require("ramda");
const Org = require('../../db/models').org;


/**
 * @description create sns topics for email notification
 * @param sns - instance of sns
 * @param {Object} config
 * @return {Promise<Object>} - add to config ARN of bounce and complaint SNS
 */
function createSnsTopics(sns, config) {
    const SNS_ALL = 'thunder-mail-all';
    const SNS_BOUNCE = 'thunder-mail-bounce';
    const SNS_COMPLAINT = 'thunder-mail-complaint';

    const create = (name) => {
        // If this queue already exists, it just returns the ARN
        console.log(`Creating SNS topic: ${name}`);
        return sns.createTopic({ Name: name }).promise();
    };

    return Promise
        .all([
            create(SNS_ALL),
            create(SNS_BOUNCE),
            create(SNS_COMPLAINT)
        ])
        .then(topics => {
            return R.merge(config, {
                sns: {
                    all: { arn: topics[0].TopicArn },
                    bounce: { arn: topics[1].TopicArn },
                    complaint: { arn: topics[2].TopicArn }
                }
            });
        });
}

/**
 * @description create sqs queue so we can push and pull email notifications.
 * @param sqs
 * @param {Object} config
 * @return {Promise<Object>} add to config ARN and URL to SQS
 */
function createSqsQueue(sqs, config) {
    console.log("Creating SQS queue");
    const SQS_NAME = 'thunder-mail-ses-feedback';

    //TODO: GO OVER THIS POLICY AND FULLY UNDERSTAND IT!
    // Configure the SQS permissions so that it can receive
    // messages from SNS. This is a bit fiddly because we have to
    // make sure that SQS only receives SNS messages from the bounce
    // and complaint topics we have set up, otherwise anyone would be able
    // to abuse the queue.
    // See https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
    const policy = {
        Version: "2012-10-17",
        Id: "thunder-mail-ses-feedback-queue-policy",
        Statement:
            {
                Sid: "thunder-mail-ses",
                Effect: "Allow",
                Principal: "*",
                Action: "SQS:*",
                // Hacky way of calculating the arn
                Resource: `arn:aws:sqs:${config.sns.all.arn.split(':')[3]}:${config.sns.all.arn.split(':')[4]}:${SQS_NAME}`,
                Condition: {
                    ArnEquals: {
                        "aws:SourceArn": [config.sns.all.arn]
                    }
                }
            }
    };

    return sqs
        .createQueue({
            QueueName: SQS_NAME,
            Attributes: {
                ReceiveMessageWaitTimeSeconds: '20',
                DelaySeconds: '120',
                Policy: JSON.stringify(policy)
            }
        })
        .promise()
        .then(result => {
            config.sqs.url = result.QueueUrl;
            return Org
                .findOne({ where: { domain: process.env.DOMAIN } })
                .then(org => org.update({ amazonSQSUrl: result.QueueUrl }))
                .then(() => sqs
                    .getQueueAttributes({
                        QueueUrl: config.sqs.url,
                        AttributeNames: ["QueueArn"]
                    }).promise());

        })
        .then(result => {
            return R.merge(config, { sqs: { arn: result.Attributes.QueueArn, url: config.sqs.url } });
        });
}

/**
 * @description subscribe sns to sqs
 * @param sns
 * @param {Object} config
 * @return {Promise<Object>}
 */
function subscribeSnsToSqs(sns, config) {
    console.log("Subscribing topics to queue");

    return sns.subscribe({
        TopicArn: config.sns.all.arn,
        Protocol: 'sqs',
        Endpoint: config.sqs.arn
    }).promise()
        .then(() => {
            return config;
        });
}

/**
 * @notInUse
 * @description subscribe ses to sns
 * @param ses
 * @param config
 * @return {Promise<Object>}
 */
function subscribeSesToSns(ses, config) {
    return Promise
        .all([
            ses.setIdentityNotificationTopic({
                Identity: process.env.SES_EMAIL_ADDRESS,
                NotificationType: "Bounce",
                SnsTopic: config.sns.bounce.arn
            }).promise(),
            ses.setIdentityNotificationTopic({
                Identity: process.env.SES_EMAIL_ADDRESS,
                NotificationType: "Complaint",
                SnsTopic: config.sns.complaint.arn
            }).promise()
        ])
        .then(() => config);
}

module.exports = {
    /**
     * update AWS configuration
     * @param {Object} config
     * @param {String} config.accessKeyId
     * @param {String} config.secretAccessKey
     * @param {String} config.region
     * @return {*}
     */
    updateAWS: (config) => {
        AWS.config.update({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region
        });

        return AWS;
    },
    getSES: (aws = AWS) => new aws.SES({ apiVersion: '2010-12-01' }),

    /**
     * @description configure SES service
     * @param AWS
     * @param config
     * @return Promise
     */
    updateAWSSettings: (AWS, config) => {
        const ses = new AWS.SES({ apiVersion: '2010-12-01' });
        const sns = new AWS.SNS();
        const sqs = new AWS.SQS();

        return createSnsTopics(sns, config)
            .then((config) => createSqsQueue(sqs, config))
            .then((config) => subscribeSnsToSqs(sns, config))
            .then((config) => subscribeSesToSns(ses, config))
            .catch(reason => {
                console.error(reason);
            });
    }
};
