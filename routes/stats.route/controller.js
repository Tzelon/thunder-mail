const R = require('ramda');
const moment = require('moment');
const { Op } = require('sequelize');

const getDateKey = (timeRange) => {
    const formatRange = R.curry((timeRange, date) => `${moment(date).startOf(timeRange).format("YYYY-MM-DD")}-${moment(date).endOf(timeRange).format("YYYY-MM-DD")}`);
    return R.cond([
        [R.equals("day"), R.curry((__, date) => moment(date).format("YYYY-MM-DD"))],
        [R.equals("week"), formatRange],
        [R.equals("month"), formatRange]
    ])(timeRange);
};

const getStats = R.curry(function getStats(Activities, {
    offset = 0,
    limit = 25,
    fromDate = moment().format("YYYY-MM-DD"),
    toDate = moment().add(1, 'days').format("YYYY-MM-DD"),
    groupBy = "day"
}) {
    // helper functions
    const emailStatus = R.curry((status, history) => R.compose(R.complement(R.isEmpty), R.filter(R.propEq('status', status)))(history));

    return Activities
        .findAll({
            offset,
            limit,
            where: {
                createdAt: {
                    [Op.between]: [fromDate, toDate]
                }
            }
        })
        .then(records => {
            const aggregator = R.pipe(
                R.groupBy((record) => moment(record.get('createdAt'))[groupBy]()),
                R.values,
                R.map((group) => ({
                        date: getDateKey(groupBy)(group[0].get('createdAt')), //I don't like it that we use group[0]
                        stats: R.reduce((acc, record) => {
                            const delivered = emailStatus('delivery', record.get('history'));
                            const bounced = emailStatus('bounced', record.get('history'));
                            const unsubscribed = emailStatus('unsubscribe', record.get('history'));

                            return ({
                                opens: record.get('opened') ? acc.opens + 1 : acc.opens,
                                clicks: record.get('clicked') ? acc.clicks + 1 : acc.clicks,
                                sent: acc.sent + 1,
                                delivered: delivered ? acc.delivered + 1 : acc.delivered,
                                bounced: bounced ? acc.bounced + 1 : acc.bounced,
                                unsubscribed: unsubscribed ? acc.unsubscribed + 1 : acc.unsubscribed
                            });
                        }, { opens: 0, clicks: 0, sent: 0, delivered: 0, bounced: 0, unsubscribed: 0 }, group)
                    })
                )
            );
            return aggregator(records);
        });
});


module.exports = {
    getStats
};