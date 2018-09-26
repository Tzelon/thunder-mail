module.exports = function (sequelize, DataTypes) {
    const Activity = sequelize.define('activity', {
        trackingId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        messageId: { type: DataTypes.STRING, unique: true },
        recipient: DataTypes.STRING,
        from: DataTypes.STRING,
        subject: DataTypes.STRING,
        apiKeyUUID: DataTypes.STRING,
        opened: { type: DataTypes.BOOLEAN, defaultValue: false },
        clicked: { type: DataTypes.BOOLEAN, defaultValue: false },
        history: { type: DataTypes.JSON, defaultValue: [{ status: "creating", date: new Date() }] }
    }, {
        freezeTableName: true
    });

    Activity.associate = function (models) {
        Activity.belongsTo(models.subscriber, { foreignKey: 'recipient' });
        Activity.belongsTo(models.org);
    };

    Activity.updateOne = (trackingId, updateFn) => {
        Activity
            .findOne({ where: { trackingId } })
            .then(activity => {
                return activity.update(updateFn(activity));
            });
    };


    return Activity;
};
