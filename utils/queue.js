const Bottleneck = require("bottleneck");

/**
 * @description Configure queue.
 * @param {Number} rateLimit - the number of emails that can be sent to SES per second
 * @return {Object} A function to call to add an item to the queue.
 */


const limiter = new Bottleneck();


module.exports = limiter;
