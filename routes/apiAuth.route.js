const express = require('express');
const uuidAPIKey = require('uuid-apikey');
const { org } = require('../db/models');
const router = express.Router();

router.route('/')
    .post((req, res) => {
        console.log(`creating api key for: ${req.body.domain}`);
        const key = uuidAPIKey.create();
        org.createNewApiKey(key.uuid, req.body.domain)
            .then(() => {
                console.log(`api key created ${key.apiKey}`);
                return res.status(200).send(key.apiKey);
            })
            .catch((reason) => {
                console.error(reason);
                return res.status(500).send("Failed to create api key");
            });
    });


module.exports = router;