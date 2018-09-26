const crypto = require('crypto');
const algorithm = 'aes-128-cbc';
const secret = Buffer.from(process.env.ENCRYPTION_SECRET || "YOUR_SECRET_IS_NOT_SAFE").slice(0, 16);

module.exports = function (sequelize, DataTypes) {
    const Org = sequelize.define('org', {
        domain: DataTypes.STRING,
        name: DataTypes.STRING,
        apiKeyUUID: { type: DataTypes.STRING, unique: true },
        amazonSESAccessKeyId: DataTypes.STRING,
        amazonSESSecretAccessKeyEncrypted: DataTypes.STRING,
        amazonSESRegion: DataTypes.STRING,
        amazonSQSUrl: { type: DataTypes.STRING, defaultValue: '' },
        amazonSESSecretAccessKey: {
            // This virtual datatype allows us to abstract away the encryption and decryption of the AWS keys.
            // Decryption and encryption are handled by the get and set functions below and act on the
            // amazonSimpleEmailServiceSecretKeyEncrypted column where the encrypted key is stored. Because of this,
            // there is actually no amazonSimpleEmailServiceSecretKey column.
            type: new DataTypes.VIRTUAL(DataTypes.STRING, ['amazonSESSecretAccessKeyEncrypted']),
            set: function (val) {
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv(algorithm, secret, iv);
                const encrypted = cipher.update(val);
                const finalBuffer = Buffer.concat([encrypted, cipher.final()]);
                //Need to retain IV for decryption, so this can be appended to the output with a separator (non-hex for this example)
                const encryptedHex = iv.toString('hex') + ':' + finalBuffer.toString('hex');

                this.setDataValue('amazonSESSecretAccessKeyEncrypted', encryptedHex);
            },
            get: function () {
                const encryptedValue = this.getDataValue('amazonSESSecretAccessKeyEncrypted');
                if (!encryptedValue) return undefined;
                const encryptedArray = encryptedValue.split(':');
                if (encryptedArray.length !== 2) {
                    console.error(`Something wrong in amazonSESSecretAccessKeyEncrypted ${encryptedValue}`);
                    return undefined;
                }
                const iv = Buffer.from(encryptedArray[0], 'hex');
                const encrypted = Buffer.from(encryptedArray[1], 'hex');
                const decipher = crypto.createDecipheriv(algorithm, secret, iv);
                const decrypted = decipher.update(encrypted);
                const clearText = Buffer.concat([decrypted, decipher.final()]).toString();

                return clearText;
            }
        },
        sentEmailsCount: { type: DataTypes.INTEGER, defaultValue: 0 }
    });

    Org.associate = function (models) {
        Org.Subscribers = Org.hasMany(models.subscriber);
        Org.Activity = Org.hasOne(models.activity);
    };

    Org.createNewApiKey = (apiKeyUUID, domain) => {
        return Org.getOne(domain)
            .then(org => {
                return org.update({ apiKeyUUID });
            });
    };

    Org.getApiKey = (apiKeyUUID) => {
        return Org.findOne({ where: { apiKeyUUID } })
            .then(org => {
                if (org) {
                    return org.get({ plain: true });
                }
                throw new Error(`Couldn't find api key ${apiKeyUUID}`);
            });
    };

    Org.updateOne = (domain, updateObject) => {
        //we wan't to make sure we don't update the apiKeyUUID
        delete updateObject.apiKeyUUID;

        return Org.getOne(domain)
            .then(org => {
                return org.update(updateObject);
            });
    };

    /**
     * retrieve org by domain name if plain = true return only plain object with virtual fields
     * else return sequelize object
     * @param {String} domain
     * @param {Boolean} plain=true
     * @return {Promise<Model>}
     */
    Org.getOne = (domain, plain = false) => {
        return Org.findOne({ where: { domain } })
            .then(org => {
                if (org) {
                    return !plain ? org : org.get({ plain });
                }
                throw new Error(`Can't find org for domain ${domain}`);
            });
    };

    Org.createOne = ({ domain, name }) => {
        return Org.create({ domain, name });
    };

    return Org;
};
