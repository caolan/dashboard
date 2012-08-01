define([
    'couchr',
    'events',
    './utils'
],
function (couchr, events, utils) {
    var exports = new events.EventEmitter();


    // updated by calling info
    exports.sessionInfo = null;


    var info_in_progress = false;
    var info_callbacks = [];

    function info_apply_callbacks() {
        for (var i = 0; i < info_callbacks.length; i++) {
            info_callbacks[i].apply(this, arguments);
        }
        info_callbacks = [];
    }

    exports.info = function (/*optional*/callback) {
        if (info_in_progress) {
            if (callback) {
                info_callbacks.push(callback);
            }
            return;
        }

        info_in_progress = true;
        if (callback) {
            info_callbacks.push(callback);
        }
        else if (!info_callbacks.length) {
            info_callbacks.push(utils.logErrorsCallback);
        }

        couchr.get('/_session', function (err, data) {
            if (err) {
                return info_apply_callbacks(err);
            }
            if (JSON.stringify(data) !== JSON.stringify(exports.sessionInfo)) {
                exports.sessionInfo = data;
                exports.emit('change', data);
            }
            return info_apply_callbacks(null, data);
        });
    };

    exports.infoCached = function (callback) {
        if (exports.sessionInfo) {
            return callback(null, exports.sessionInfo);
        }
        exports.info(callback);
    };


    exports.logout = function (callback) {
        callback = callback || utils.logErrorsCallback;

        var data = {username: '_', password: '_'};
        couchr.delete('/_session', data, function (err, resp) {
            if (err) {
                return callback(err);
            }
            exports.session = {userCtx: {name: null, roles: []}}
            exports.emit('change', exports.session);
            callback(null, exports.session);
        });
    };


    exports.login = function (username, password, callback) {
        var data = {name: username, password: password};
        couchr.post('/_session', data, function (err, resp) {
            if (err) {
                return callback(err);
            }
            exports.session = {userCtx: {name: username, roles: resp.roles}}
            exports.emit('change', exports.session);
            callback(null, exports.session);
        });
    };


    return exports;
});
