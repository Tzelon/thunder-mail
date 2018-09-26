require('dotenv').config();
const Org = require('../models').org;

module.exports = {
    up: (queryInterface, Sequelize) => {
        console.log("start seeding org test");
        return Org.findOne({
            where: { domain: 'test' }
        })
            .then(org => {
                if (org) {
                    return console.log("org test found will not create new org");
                }
                return Org.create({
                    name: 'Circle.gg',
                    domain: 'test',
                    amazonSESAccessKeyId: "AKIAJWMQTE6SI7XSKS7A",
                    amazonSESSecretAccessKey: "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",
                    amazonSESRegion: "us-east-1",
                    amazonSQSUrl: "https://sqs.us-east-1.amazonaws.com/244011763882/mailyto-ses-feedback",
                    apiKeyUUID: "96edaf5c-2f68-418a-a7a7-fc1d3e5300de",
                    subscribers: [
                        {
                            email: 'tzelon@circle.gg'
                        }
                    ]
                }, {
                    include: [
                        Org.Subscribers
                    ]
                });
            })
            .catch(reason => {
                console.error(reason);
            });

    },

    down: (queryInterface, Sequelize) => {
        /*
          Add reverting commands here.
          Return a promise to correctly handle asynchronicity.

          Example:
          return queryInterface.bulkDelete('Person', null, {});
        */
    }
};
