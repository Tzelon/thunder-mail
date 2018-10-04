const exampleRoute = require('./example.route');
const emailRoute = require('./email.route');
const statsRoute = require('./stats.route');
const trackingRoute = require('./tracking.route');
const apiAuthRoute = require('./apiAuth.route');
const orgRoute = require('./orgs.route');

module.exports = (app) => {

    // API routes, No need to authenticate, we are using App Key
    app.use('/api/example', exampleRoute);
    app.use('/', trackingRoute);
    app.use('/api/orgs', orgRoute);
    app.use('/api/stats', statsRoute);
    app.use('/api/email', emailRoute);
    app.use('/api/apiAuth', apiAuthRoute);
};
