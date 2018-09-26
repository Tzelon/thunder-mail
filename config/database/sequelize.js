const db = require('../../db/models');

module.exports = {
    init: () => {
        const { sequelize } = db;

        sequelize.sync({ force: false, hooks: true })
            .then(() => console.log("sync database with sequelize"))
            .catch(reason => {
                console.error(reason);
            });
    }
};

