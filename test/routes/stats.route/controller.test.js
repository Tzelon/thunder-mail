const { statsBySubscriberEmail } = require('../../../routes/stats.route/schemas');
const controller = require('../../../routes/stats.route/controller');
const { validateRequestBody } = require('../../../routes/shared.controller');

describe('email route controller functions', function () {

    describe('validateRequestBody function', function () {
        it('should validate', function () {
            const param = { "email": "exmpale@gmail.com" };
            return validateRequestBody(statsBySubscriberEmail, param);
        });

        it('should failed to validate validate', function () {
            const param = { "email": "TEST" };

            return validateRequestBody(statsBySubscriberEmail, param)
                .catch((reason) => {
                    expect(reason.message).to.include('"email" must be a valid email');
                });
        });
    });
});