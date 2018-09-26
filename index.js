require('dotenv').config();
global.Promise = require("bluebird");

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes');
const startup = require('./config/startup');

const app = express();
const PORT = process.env.PORT || 8080;
app.use(helmet()); // Implements various security tweaks to http response headers
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
routes(app);


startup()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`
################################  
# Thunder Mail server started  #
# Port: ${PORT}                   #
################################
`);
        });
    })
    .catch(reason => {
        console.error(reason);
    });
