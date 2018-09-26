const cheerio = require('cheerio');

/**
 * @description Add tracking info such as an unsubscribe link or tracking pixel where necessary
 * @param {string} body - The body of the email
 * @param {string} trackingId - Pre-configured tracking id for this email
 * @param {string} whiteLabelUrl - Pre-configured white label url for this email
 * @return {object} Object with bound functions as props
 */

function wrapLink({ html, text, trackingId, whiteLabelUrl }) {
    const host = whiteLabelUrl || process.env.PUBLIC_HOSTNAME;

    if (html) {
        const $ = cheerio.load(html);

        $('a').each(function (index, element) {
            $(this).replaceWith(`<a href="${host}/clickthrough/${trackingId}?url=${element.attribs.href}">${$(this).text()}</a>`);
        });

        html = $.html();
    }
    return { text, html, trackingId, whiteLabelUrl };
}

function insertUnsubscribeLink({ html, text, trackingId, whiteLabelUrl }) {
    const host = whiteLabelUrl || process.env.PUBLIC_HOSTNAME;

    const unsubscribeUrl = `${host}/unsubscribe/${trackingId}`;

    if (text) {
        text += '\t\r\n\t\r\n\t\r\n\t\r\n\t\r\n\t\r\n' + unsubscribeUrl;
    }

    if (html) {
        html += "<br/><br/><br/><br/><br/>" + `<a href="${unsubscribeUrl}">unsubscribe</a>`;
    }


    return { text, html, trackingId, whiteLabelUrl };
}

/**
 * @description inset tracking pixel into the email body ONLY work on html
 * @param {String} body - html body of the email
 * @param {String} trackingId - tracking id of the activity
 * @param {String} whiteLabelUrl - from where to get the pixel
 * @return {Object} html body with the pixel
 */
function insertTrackingPixel({ html, text, trackingId, whiteLabelUrl }) {
    const host = whiteLabelUrl || process.env.PUBLIC_HOSTNAME;

    if (html) {
        html += `\n<img src="${host}/trackopen/${trackingId}" style="display:none">`;
    }

    return { text, html, trackingId, whiteLabelUrl };
}

module.exports = {
    wrapLink,
    insertUnsubscribeLink,
    insertTrackingPixel
};
