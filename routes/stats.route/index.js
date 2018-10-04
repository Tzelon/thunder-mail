const express = require('express');
const R = require('ramda');
const { checkAPIKey } = require('../../middleware');
const { activity: Activity, subscriber: Subscriber } = require('../../db/models');
const { validateRequestBody } = require('../shared.controller');
const { getStats } = require('./controller');
const { statsBySubscriberEmail } = require('./schemas');

const router = express.Router();

router.route('/')
    .get(checkAPIKey, (req, res) => {
        const action = R.pipeP(
            validateRequestBody(statsBySubscriberEmail),
            getStats(Activity)
        );

        action(req.query)
            .then(value => {
                res.status(200).json(value);
            });
    });


module.exports = router;