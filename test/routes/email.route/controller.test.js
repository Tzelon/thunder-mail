const sendEmailSchema = require('../../../routes/email.route/schemas');
const controller = require('../../../routes/email.route/controller');
const { validateRequestBody } = require('../../../routes/shared.controller');

describe('email route controller functions', function () {

    describe('template function', function () {
        it('should return template string', function () {
            const string = controller.template("<h1>{{demo}}</h1>", { demo: "hello world" });
            expect(string).to.equal("<h1>hello world</h1>");
        });

        it('should throw an error', function () {
            expect(() => controller.template("<h1>{{demo}</h1>", {})).to.throw();
        });
    });


    describe('validateRequestBody function', function () {
        it('should validate', function () {
            const param = {
                "source": "tzelon47@gmail.com",
                "destination": {
                    "to": ["tzelon@circle.gg"]
                },
                "message": {
                    "subject": "TEST ",
                    "body": {
                        "html": "Hello Tzelon <a href='audicle.app' target='_blank'>Audicle.app</a>"
                    }
                }
            };
            return validateRequestBody(sendEmailSchema, param);
        });

        it('should failed to validate validate', function () {
            const param = {
                "source": "tzelon47@gmail.com",
                "message": {
                    "subject": "TEST ",
                    "body": {
                        "text": "Hello Tzelon TEXT",
                        "html": "Hello Tzelon <a href='audicle.app' target='_blank'>Audicle.app</a>"
                    }
                }
            };

            return validateRequestBody(sendEmailSchema, param)
                .catch((reason) => {
                    expect(reason.message).to.include('"destination" is require');
                });
        });
    });

    describe('createDestinationsEmail function', function () {
        it('should receive destination array', function () {
            const param = {
                "source": "source_example@test.com",
                "destination": [
                    { "to": ["to_1@test.com", "to_2@test.com"] },
                    { "to": ["to_2@test.com"], "cc": ["cc_1@test.com"] }
                ],
                "message": {
                    "subject": "TEST",
                    "body": {
                        "html": "Hello {{name}} <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
                    }
                }
            };

            return controller.createDestinationsEmail(param)
                .then(destinations => {
                    expect(destinations.length).to.equal(2);
                    expect(destinations[0]).to.eql({
                        "from": "source_example@test.com",
                        "to": ["to_1@test.com", "to_2@test.com"],
                        "subject": "TEST",
                        "body": {
                            "html": "Hello  <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
                        }
                    });
                    expect(destinations[1]).to.eql({
                        "from": "source_example@test.com",
                        "to": ["to_2@test.com"],
                        "cc": ["cc_1@test.com"],
                        "subject": "TEST",
                        "body": {
                            "html": "Hello  <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
                        }
                    });
                });
        });

        it('should receive destination object', function () {
            const param = {
                "source": "source_example@test.com",
                "destination": {
                    "to": ["to_1@test.com"]
                },
                "message": {
                    "subject": "TEST",
                    "body": {
                        "text": "Hello Thunder-Mail"
                    }
                }
            };

            return controller.createDestinationsEmail(param)
                .then(destinations => {
                    expect(destinations.length).to.equal(1);
                    expect(destinations[0]).to.eql({
                        "from": "source_example@test.com",
                        "to": ["to_1@test.com"],
                        "subject": "TEST",
                        "body": {
                            "text": "Hello Thunder-Mail"
                        }
                    });
                });
        });

        it('should override global fields with local fields', function () {
            const param = {
                "source": "source_example@test.com",
                "destination": {
                    "to": ["to_1@test.com"],
                    "subject": "Hello {{name}}",
                    "templateData": { "name": "Amos" }
                },
                "message": {
                    "subject": "TEST",
                    "body": {
                        "html": "Hello {{name}} <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
                    }
                }
            };

            return controller.createDestinationsEmail(param)
                .then(destinations => {
                    expect(destinations.length).to.equal(1);
                    expect(destinations[0]).to.eql({
                        "from": "source_example@test.com",
                        "to": ["to_1@test.com"],
                        "subject": "Hello Amos",
                        "body": {
                            "html": "Hello Amos <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
                        }
                    });
                });
        });


        it('should override global fields with local fields only if templateData is exist in destination object', function () {
            const param = {
                "source": "source_example@test.com",
                "destination": [
                    {
                        "to": ["to_1@test.com"],
                        "subject": "Hello {{name}}",
                        "templateData": { "name": "Amos" }
                    },
                    {
                        "to": ["to_2@test.com"]
                    }
                ],
                "message": {
                    "subject": "TEST",
                    "body": {
                        "html": "Hello {{name}} <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
                    }
                }
            };

            return controller.createDestinationsEmail(param)
                .then(destinations => {
                    expect(destinations.length).to.equal(2);
                    expect(destinations[1]).to.eql({
                        "from": "source_example@test.com",
                        "to": ["to_2@test.com"],
                        "subject": "TEST",
                        "body": {
                            "html": "Hello  <a href='thunder-mail' target='_blank'>Thunder-Mail</a>"
                        }
                    });
                });
        });
    });
});