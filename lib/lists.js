var templates = require('handlebars').templates;
var gravatar = require('gravatar');
var utils = require('lib/utils');
var dashboard_links  = require('lib/dashboard_links');
var dashboard_settings = require('lib/settings');
var _ = require('underscore')._;

exports.topbar = function(head, req) {
    var settingsDoc = {};
    var row;
    var apps = [];
    while ((row = getRow())) {
        if (row.key[0] === 0) settingsDoc = row.value;

        if (row.key[0] === 1) {
            if (row.key[3] == 'install') {
                apps.push({
                    title : row.key[2],
                    db :row.value.db,
                    doc : row.doc
                })
            }
            if (row.key[3] == 'link') {
                apps.push({
                    title : row.key[2],
                    link :row.value.url,
                    doc  : row.doc
                })
            }
        }
    }
    var settings = _.defaults(settingsDoc, dashboard_settings.defaultSettings);
    var dashboard_url = dashboard_links.dashboardURL(settings, 'dashboard', 'dashboard', req);
    var settings_url  = dashboard_url + "settings";
    var login_url = dashboard_url + 'login';
    var username, avatar, avatar_large = null;
    var isAdmin = false;
    var isUser  = utils.isUser(req);
    var isAdminParty = utils.isAdminParty(req);
    if (utils.isAdmin(req) || isAdminParty) {
        isAdmin = true;
    }
    if (isUser) {
        username = req.userCtx.name;
        avatar = gravatar.avatarURL({
            email : req.userCtx.name,
            size : 20,
            default_image : 'mm'
        });
        avatar_large = gravatar.avatarURL({
            email : req.userCtx.name,
            size : 96,
            default_image : 'mm'
        });

    }

    var hide_apps = (!isUser && settings.host_options.redirect_frontpage_on_anon);

    apps = _.map(apps, function(app) {
        if (app.db) {
            app.link = dashboard_links.appUrl(settingsDoc, app.doc, req);
        }
        return app;
    });

    var grouped_apps = _.groupBy(apps, function(app) {
        if (app.doc.onDropdownMenu) return "more_apps"
        else return "apps";
    });



    var usrCtxString = encodeURI(JSON.stringify(req.userCtx));

    start({'headers' : {'Content-Type' : 'text/html'}});
    send(templates['topbar.html']({
        dashboard_url : dashboard_url,
        settings_url : settings_url,
        login_url : login_url,
        apps : grouped_apps,
        username : username,
        avatar : avatar,
        avatar_large : avatar_large,
        isAdmin: isAdmin,
        isAdminParty : isAdminParty,
        hide_apps : hide_apps,
        settings : settings,
        usrCtxString : usrCtxString
    }));
}