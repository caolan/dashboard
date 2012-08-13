define([
    'exports',
    'lodash'
],
function (exports, _) {

    exports.isAdmin = function (userCtx, p) {
        if (_.include(userCtx.roles, '_admin')) {
            return true;
        }
        var admins = p.security.admins || {roles: [], names: []};
        if (_.include(admins.names, userCtx.name)) {
            return true;
        }
        _.each(userCtx.roles, function (r) {
            if (_.include(admins.roles, r)) {
                return true;
            }
        });
        return false;
    };

    exports.noAdminsDefined = function (p) {
        var s = p.security;
        if (!s.admins) {
            return true;
        }
        return (
            s.admins.names.length === 0 &&
            s.admins.roles.length === 0
        );
    };

    exports.isPublic = function (p) {
        var s = p.security;
        if (!s.members) {
            return true;
        }
        return (
            s.members.names.length === 0 &&
            s.members.roles.length === 0
        );
    };

    exports.isMember = function (userCtx, p) {
        if (exports.isPublic(p) || exports.isAdmin(userCtx, p)) {
            return true;
        }
        var members = p.security.members;
        if (_.include(members.names, userCtx.name)) {
            return true;
        }
        _.each(userCtx.roles, function (r) {
            if (_.include(members.roles, r)) {
                return true;
            }
        });
        return false;
    };

    exports.isMissingTemplate = function (p) {
        return !!(p.unknown_root);
    };

    exports.hasUnknownTemplate = function (p) {
        return !p.unknown_root && !p.dashboard;
    };

});
