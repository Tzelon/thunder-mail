# Send Emails Via API, For Less Using Amazon SES
### Thunder Mail is an open source, easy to use platform for sending emails at low cost, 
### send thousands of emails at $0.10 per 1000 emails. 

## Benefits

#### Integrate and deliver via API in 5 minutes or less.
Our APIs provide a customizable integration approach for your transactional email.

#### Robust and reliable delivery.
Gain peace of mind using the power of Amazon SES to send your emails reliably.

#### Real-Time monitoring.
With each click and open tracked alongside the bounces and unsubscribes, you’ll be able to monitor the performance of each and every email.

#### Transactional email templates.
Send highly targeted emails without worrying about dangerous deploys or bloated code. With native support for Handlebars syntax dynamic templating, you can send multiple templates using our APIs.


## Getting Started
### Setting up Thunder Mail (docker)
This guide was written for linux-based machines (Ubuntu 16.04).

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
BLUEBIRD_WARNINGS=0
PSQL_DATABASE=thundermail
PSQL_PASSWORD=123456
PSQL_USERNAME=u1
PORT=80
ENCRYPTION_SECRET=aaaaaaaaaaaaaaaa

DOMAIN=test
SES_ACCESS_KEY_ID=AAAAAAAAAAAAAAAAAAAA
SES_SECRET_ACCESS_KEY=BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
SES_REGION=us-east-1
SES_EMAIL_ADDRESS=test@test.com
```

Start the Docker file.
```
sudo docker-compose up
```




Special thanks to [mail-for-good](https://github.com/freeCodeCamp/mail-for-good/) for the inspiration to build and open source Thunder-Mail