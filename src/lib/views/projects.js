define([
    'require',
    'jquery',
    'lodash',
    '../projects',
    '../settings',
    '../session',
    'hbt!../../templates/projects',
    'hbt!../../templates/navigation',
    'bootstrap/js/bootstrap-button'
],
function (require, $, _) {

    var tmpl = require('hbt!../../templates/projects'),
        projects = require('../projects'),
        settings = require('../settings'),
        session = require('../session');


    function getProjectList() {
        var plist = projects.get();
        var cfg = settings.get().projects;

        if (!cfg.show_no_templates) {
            plist = _.reject(plist, function (p) {
                return p.unknown_root;
            });
        }
        if (!cfg.show_unknown_templates) {
            plist = _.reject(plist, function (p) {
                return !p.unknown_root && !p.dashboard;
            });
        }
        return plist;
    }


    function renderProjects(ps, userCtx) {
        // filter out projects the user does not have permission to access
        ps = _.filter(ps, _.partial(projects.isMember, userCtx));

        // set is_admin on projects user is admin of
        ps = _.map(ps, function (p) {
            p.is_admin = projects.isAdmin(userCtx, p);
            return p;
        });

        // does user have admin access to any projects in the list?
        var has_admin = _.any(ps, _.partial(projects.isAdmin, userCtx));

        // render projects page
        $('#content').html(tmpl({
            has_any_admin: has_admin,
            projects: ps
        }));
    }


    return function () {
        session.infoCached(function (err, info) {
            renderProjects(getProjectList(), info.userCtx);
            session.on('change', function (info) {
                renderProjects(getProjectList(), info.userCtx);
            });
        });

        $('#navigation').html(
            require('hbt!../../templates/navigation')({
                projects: true
            })
        );

        $('#projects-refresh-btn').click(function (ev) {
            ev.preventDefault();
            var that = this;

            $(this).button('loading');
            $('#admin-bar-status').html('');
            $('#main').html('');

            var refresher = projects.refresh(function (err) {
                if (err) {
                    // TODO: add error alert box to status area
                    return console.error(err);
                }

                var bar = $('#admin-bar-status .progress .bar');
                var fn = function () {
                    $('#admin-bar-status .progress').fadeOut(function () {
                        session.infoCached(function (err, info) {
                            if (err) {
                                return console.error(err);
                            }
                            renderProjects(getProjectList(), info.userCtx)
                        });
                    });
                    $(that).button('reset');
                };
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
        });
    };

});
