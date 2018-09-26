const express = require('express');
const { org } = require('../../db/models');
const router = express.Router();

router.route('/:domain')
    .patch((req, res) => {

        org.updateOne(req.params.domain, req.body.fields)
            .then(value => {
                console.log(value);
                res.status(200).send();
            })
            .catch(reason => {
                console.error(reason);
                res.status(500).send();
            });



    })
    .get((req, res) => {
        org.getOne(req.params.domain, /*Plain*/true)
            .then(value => {
                console.log(value);
                res.status(200).send();
            })
            .catch(reason => {
                console.error(reason);
                res.status(500).send();
            });
    });


module.exports = router;