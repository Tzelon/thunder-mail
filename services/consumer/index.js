/**
 * @description consumer service job is to get all the notifications from SQS and update the Activity[history] table in the database
 * */

const consumer = require('./consumer');

consumer.start();