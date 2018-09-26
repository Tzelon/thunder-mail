const express = require('express');
const router = express.Router();

//Only an example router
router.route('/ping')
    .get((req, res) => {
        res.status(200).send("pong")
    });


module.exports = router;