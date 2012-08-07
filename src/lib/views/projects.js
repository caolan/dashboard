define([
    'exports',
    'require',
    'jquery',
    'lodash',
    '../remote/projects',
    '../remote/settings',
    '../remote/session',
    '../collections/projects',
    'hbt!../../templates/projects'
],
function (exports, require, $, _) {

    var tmpl = require('hbt!../../templates/projects'),
        projects = require('../remote/projects'),
        settings = require('../remote/settings'),
        session = require('../remote/session'),
        p_collection = require('../collections/projects');


    exports.filterProjects = function (cfg, userCtx, ps) {
        // filter projects based on preferences in settings object
        if (!cfg.show_no_templates) {
            ps = _.reject(ps, p_collection.isMissingTemplate);
        }
        if (!cfg.show_unknown_templates) {
            ps = _.reject(ps, p_collection.hasUnknownTemplate);
        }
        // filter out projects the user does not have permission to access
        var r = _.filter(ps, _.partial(p_collection.isMember, userCtx));
        return r;
    };


    exports.render = function (cfg, userCtx, ps) {
        ps = exports.filterProjects(cfg, userCtx, ps);
        ps = _.map(ps, function (p) {
            p.is_admin = p_collection.isAdmin(userCtx, p);
            return p;
        });
        var el = $(tmpl({
            // does user have admin access to any projects in the list?
            has_any_admin: _.any(ps, _.partial(p_collection.isAdmin, userCtx)),
            projects: ps
        }));
        // bind event handler to refresh button
        $('#projects-refresh-btn', el).click(
            exports.$doRefresh(cfg, userCtx, ps)
        );
        return el;
    };


    exports.$doRefresh = function (cfg, userCtx, ps) {
        return function (ev) {
            ev.preventDefault();
            var that = this;

            $(this).button('loading');
            $('#admin-bar-status').html('');
            $('#main').html('');

            var refresher = projects.$refresh(function (err) {
                if (err) {
                    // TODO: add error alert box to status area
                    return console.error(err);
                }

                var bar = $('#admin-bar-status .progress .bar');
                var fn = function () {
                    $('#admin-bar-status .progress').fadeOut(function () {
                        $('#content').html( exports.render(cfg, userCtx, ps));
                    });
                    $(that).button('reset');
                };
                // TODO: support browsers that don't provide transitionEnd!
                bar.one('transitionEnd', fn);
                bar.one('oTransitionEnd', fn);       // opera
                bar.one('msTransitionEnd', fn);      // ie
                bar.one('transitionend', fn);        // mozilla
                bar.one('webkitTransitionEnd', fn);  // webkit
            });

            $('#admin-bar-status').html(
                '<div class="progress"><div class="bar"></div></div>'
            );
            refresher.on('progress', function (value) {
                $('#admin-bar-status .progress .bar').css({
                    width: value + '%'
                });
            });
            return false;
        };
    };

});
