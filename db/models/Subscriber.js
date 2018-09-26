module.exports = function (sequelize, DataTypes) {
    const Subscriber = sequelize.define('subscriber', {
        email: { type: DataTypes.STRING, primaryKey: true },
        subscribed: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
        indexes: [
            { fields: ['email'] },
            { fields: ['subscribed'] }
        ]
    });

    Subscriber.associate = function (models) {
        Subscriber.Org = Subscriber.belongsTo(models.org);
    };

    Subscriber.updateOne = (email, updateFn) => {
        Subscriber
            .findOne({ where: { email, } })
            .then(subscriber => {
                return subscriber.update(updateFn(subscriber));
            });
    };

    return Subscriber;
};
