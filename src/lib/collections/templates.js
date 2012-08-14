define(['exports'], function (exports) {

    /*
    exports.getTitle = function (doc) {
        if (doc.local && doc.local.dashboard && doc.local.dashboard.title) {
            return doc.local.dashboard.title;
        }
        if (doc.remote && doc.remote.dashboard && doc.remote.dashboard.title) {
            return doc.remote.dashboard.title;
        }
        return null;
    };
    */

    exports.getIcon = function (doc, size) {
        if (doc.local && doc.local.dashboard && doc.local.dashboard.icons &&
            doc.local.dashboard.icons[size]) {
            return 'api/' + doc.ddoc_id + '/' + doc.local.dashboard.icons[size];
        }
        if (doc.remote && doc.remote.dashboard && doc.remote.dashboard.icons &&
            doc.remote.dashboard.icons[size]) {
            return doc.source.replace(/\/$/, '') +
                '/' + doc.ddoc_id + '/' + doc.remote.dashboard.icons[size];
        }
        return null;
    };

    exports.getDashIcon = function (doc) {
        if (doc.dashicon) {
            return doc.dashicon;
        }
        return exports.getIcon(doc, 22);
    };

});
