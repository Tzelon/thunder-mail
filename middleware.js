const uuidAPIKey = require('uuid-apikey');
const { org: Org } = require('./db/models');
/**
 * @param org model
 * @return {Function}
 */
const checkAPIKey = (org) => (req, res, next) => {
    /**
     * Done!
     * 1. extract api key from header
     * 2. check if API exist in database for the current org
     * 3. return next or response with 401 error
     */
    const authHeader = req.get('Authorization');

    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer' && uuidAPIKey.isAPIKey(parts[1])) {
            req['apiKeyUUID'] = uuidAPIKey.toUUID(parts[1]);
            return org.getApiKey(req['apiKeyUUID'])
                .then((org) => {
                    req.org = org;
                    return next();
                }).catch(() => {
                    return res.status(401).send("API KEY IS INVALID");
                });
        }
    }

    return res.status(400).send();
};


module.exports = {
    checkAPIKey: checkAPIKey(Org)
};