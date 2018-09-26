const express = require('express');
const moment = require('moment');
const { activity: Activity, subscriber: Subscriber } = require('../db/models');

const router = express.Router();
const trackingPixel = Buffer.alloc(58, 'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw', 'base64');

router.route('/unsubscribe/:trackingId')
    .get((req, res) => {
        Activity
            .findOne({ where: { trackingId: req.params.trackingId } })
            .then((activity) => {
                Subscriber
                    .updateOne(activity.recipient, (subsriber) => ({
                        subscribed: false
                    }));
            });

        res.status(200).send("unsubscribe successfully from this email list");

    });

router.route('/trackopen/:trackingId')
    .get((req, res) => {
        Activity
            .updateOne(req.params.trackingId, (activity) => ({
                opened: true,
                history: [
                    ...activity.history,
                    {
                        status: 'opened',
                        date: moment().format(),
                        meta: {
                            userAgent: req.headers['user-agent']
                        }
                    }
                ]
            }));

        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': trackingPixel.length
        });
        res.end(trackingPixel);
    });

router.route('/clickthrough/:trackingId')
    .get((req, res) => {
        Activity
            .updateOne(req.params.trackingId, (activity) => ({
                clicked: true,
                history: [
                    ...activity.history,
                    {
                        status: 'clicked',
                        date: moment().format(),
                        meta: {
                            userAgent: req.headers['user-agent']
                        }
                    }
                ]
            }));

        res.status(301).redirect(req.query.url.includes("http") ? req.query.url :`https://${req.query.url}`);
    });


module.exports = router;