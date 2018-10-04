
[![Thunder-Mail](https://img.shields.io/hackage-deps/v/lens.svg?style=popout-square)](https://github.com/Circle-gg/thunder-mail/blob/master/package.json)
[![LICENSE.txt](https://img.shields.io/crates/l/rustc-serialize.svg?style=popout-square)](https://github.com/Circle-gg/thunder-mail/blob/master/LICENSE.txt)
[![Gitter](https://img.shields.io/gitter/room/nwjs/nw.js.svg?style=popout-square)](https://gitter.im/Thunder-Mail/Lobby#)

| [Website](https://thunder-mail-website.herokuapp.com/) | [API Reference](https://thunder-mail-website.herokuapp.com/developers/docs/api) | [Getting Started Guide](https://thunder-mail-website.herokuapp.com/developers/docs/guide) |

# What is Thunder Mail?
#### Thunder Mail is an open source app for sending millions of emails using API for as cheaply as possible.

#### Send millions of emails at $0.10 per 1000 emails.

#### Start sending emails withing 5 minutes [quick start](#getting-started)

Checkout developers section in our website [Thunder-Mail Developers](https://thunder-mail-website.herokuapp.com/developers) for more detailed information and guides, on how to use Thunder-Mail

## Benefits

#### Integrate and deliver via API in 5 minutes or less.
Our APIs provide a customizable integration approach for your transactional email.

#### Robust and reliable delivery.
Gain peace of mind using the power of Amazon SES to send your emails reliably.

#### Real-Time monitoring.
With each click and open tracked alongside the bounces and unsubscribes, you’ll be able to monitor the performance of each and every email.

#### Transactional email templates.
Send highly targeted emails without worrying about dangerous deploys or bloated code. With native support for Handlebars syntax dynamic templating, you can send multiple templates using our APIs.

## Compare to SendGrid
![Sendgrid-vs-SES](https://easysendy.com/blog/wp-content/uploads/2016/09/Cost-Table-4.png)  
[Read more](https://easysendy.com/blog/amazon-ses-vs-sendgrid/)

## Getting Started

### Setting up Thunder Mail (docker)

#### Retrieving AWS credentials
[mail-for-good](https://github.com/freeCodeCamp/mail-for-good/) did a well documented and explained guide on how to get AWS credentials [here](https://www.youtube.com/watch?v=_7U03GVD4a8)
Follow their guidance for getting AWS Access Key & Secret Access Key

#### Installing Docker
Docker is a great tool for automating the deployment of Linux applications inside software containers
We will use Docker to deploy thunder-mail as a hustle-free app.

Follow [these](https://www.digitalocean.com/community/tutorials/how-to-install-docker-compose-on-ubuntu-16-04) instruction to install docker.

#### Installing Thunder-Mail

Clone the repository.
```
git clone https://github.com/Circle-gg/thunder-mail.git
```

Navigate into the cloned directory.
```
cd thunder-mail
```

Create environment file.
```
vi .env
```

Sample .env file
```
# API key encryption secret (16 chars length)
ENCRYPTION_SECRET=

# AWS SES configuration - as we extracted in the previous section.
SES_ACCESS_KEY_ID=
SES_SECRET_ACCESS_KEY=
SES_REGION=

# The email address that emails will be sent from.
SES_EMAIL_ADDRESS=
```

Start the Docker file.
```
sudo docker-compose up
```

#### Quick Start

After you have deployed Thunder-Mail app either locally or on a cloud instance and configured your .env file

Use this code to send your first email.

```
const rp = require('request-promise');

let options = {
    method: 'POST',
    uri: 'http://localhost:8080/api/email',
    headers: {
        authorization: 'Bearer AAAAAA-AAAAAA-AAAAAA-AAAAAA',
        'content-type': 'application/json'
    },
    body: {
        source: 'YourFromEmail@mail.com',
        destination: {
            to: ['recipientTo1@mail.com', 'recipientTo2@mail.com'],
            cc: ['recipientCC1@mail.com', 'recipientCC2@mail.com'],
            bcc: ['recipientBCC1@mail.com', 'recipientBCC2@mail.com'],
            subject: 'Hi, Welcome to {{name}}',
            templateData: { name: 'Thunder-Mail' }
        },
        message:
            {
                subject: 'default subject',
                body:
                    {
                        text: 'default text',
                        html: 'Hello, <a href=\'google.com\' target=\'_blank\'>Google.com</a>'
                    }
            }
    },
    json: true
};

rp(options)
    .then(function (parsedBody) {
        // POST succeeded...
    })
    .catch(function (err) {
        // POST failed...
    });
```


Special thanks to [mail-for-good](https://github.com/freeCodeCamp/mail-for-good/) for the inspiration to build and open source Thunder-Mail
