const t1 = {
    "source": "tzelon47@gmail.com",
    "destination": {
        "to": ["tzelon112@circle.gg"],
        "subject": "TEST 3 {{name}}",
        "templateData": { "name": "tzelon" }
    },
    "message": {
        "subject": "TEST ",
        "body": {
            "text": "Hello Tzelon TEXT",
            "html": "Hello Tzelon <a href='audicle.app' target='_blank'>Audicle.app</a>"
        }
    }
};


const t2 = [
    {
        "source": "tzelon47@gmail.com",
        "to": ["tzelon112@circle.gg"],
        "subject": "TEST 3 tzelon",
        "body": {
            "text": "Hello Tzelon TEXT",
            "html": "Hello Tzelon <a href='audicle.app' target='_blank'>Audicle.app</a>"
        }
    }
];

const t3 = {
    destinations: [
        {
            "source": "tzelon47@gmail.com",
            "to": ["tzelon112@circle.gg"],
            "subject": "TEST 3 tzelon",
            "body": {
                "text": "Hello Tzelon TEXT",
                "html": "Hello Tzelon <a href='audicle.app' target='_blank'>Audicle.app</a>"
            }
        }
    ],
    meta: {
        maxSendRate: 10
    }
};
const t4 = {
    destinations: [
        {
            "source": "tzelon47@gmail.com",
            "to": ["tzelon112@circle.gg"],
            "subject": "TEST 3 tzelon",
            "body": {
                "text": "Hello Tzelon TEXT",
                "html": "Hello Tzelon <a href='audicle.app' target='_blank'>Audicle.app</a>"
            },
            validated: true
        }
    ],
    meta: {
        maxSendRate: 10
    }
};