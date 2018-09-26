const Org = require('../../db/models').org;
const { updateAWS, updateAWSSettings } = require('../aws');
const { init: sequelizeInit } = require('../database/sequelize');

function createOrg() {
    console.log("Validating default organization");
    return Org
        .findOne({
            where: { domain: process.env.DOMAIN }
        })
        .then(org => {
            if (org) {
                return;
            }

            return Org.create({
                domain: process.env.DOMAIN,
                amazonSESAccessKeyId: process.env.SES_ACCESS_KEY_ID,
                amazonSESSecretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
                amazonSESRegion: process.env.SES_REGION
            });
        });
}

function awsSetup() {
    console.log("Validating AWS configurations");
    // update AWS with the org information.
    const AWS = updateAWS({
        accessKeyId: process.env.SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
        region: process.env.SES_REGION
    });

    return updateAWSSettings(AWS, {
        ses: { email: process.env.SES_EMAIL_ADDRESS },
        sqs: { url: '', arn: '' },
        sns: { bounce: { arn: '' }, complaint: { arn: '' }, all: { arn: '' } }
    });
}

module.exports = () => {
    return Promise.all([
        //create default org
        createOrg(),
        //setup aws sqs subscription and sns topic
        awsSetup(),
        //sync the db
        sequelizeInit()
    ]);
};