define([
    'exports',
    'require',
    'lodash',
    'couchr',
    'director',
    './remote/projects',
    './remote/settings',
    './remote/session',
    './views/projects',
    './views/templates',
    './views/settings',
    './views/sessionmenu',
    './views/login',
    './views/signup',
    'hbt!../templates/navigation',
    'bootstrap/js/bootstrap-button',
    'bootstrap/js/bootstrap-modal'
],
function (exports, require, _) {

    var projects = require('./remote/projects'),
        settings = require('./remote/settings'),
        session = require('./remote/session'),
        director = require('director'),
        couchr = require('couchr');



    exports.$init = function () {
        var router = new director.Router({
            '/': {
                on: exports.$projectsPage,
                after: exports.$cleanupProjectsPage
            },
            '/templates':       exports.$templatesPage,
            '/settings':        exports.$settingsPage,
            '/login':           exports.$loginPage,
            '/login/:next':     exports.$loginPage,
            '/signup':          exports.$signupPage
        });
        router.init();

        if (!window.location.hash || window.location.hash === '#') {
            window.location = '#/';
            $(window).trigger('hashchange');
        }
        projects.$saveLocal();
        settings.$saveLocal();

        session.$info();
        session.on('change', function (data) {
            if (_.include(data.userCtx.roles, '_admin')) {
                $(document.body).addClass('is-admin');
            }
            else {
                $(document.body).removeClass('is-admin');
            }
            $('#session').html(
                require('./views/sessionmenu').render(data)
            );
        });
    };


    exports.$loginPage = function (next) {
        var username, password;
        var s_form = $('#signup-form');
        if (s_form.length) {
            username = $('#signup_username', s_form).val();
            password = $('#signup_password', s_form).val();
        }
        $('#navigation').html(
            require('hbt!../templates/navigation')({})
        );
        $('#content').html(
            require('./views/login').render(next, username, password)
        );
        $('#login_username').focus();
    };


    var $projectsPageSessionHandler = null;
    exports.$projectsPage = function () {
        var projects_view = require('./views/projects');

        session.$infoCached(function (err, info) {
            var cfg = settings.$get().projects;
            var ps = projects.$get();

            $('#navigation').html(
                require('hbt!../templates/navigation')({
                    projects: true
                })
            );
            $('#content').html(
                projects_view.render(cfg, info.userCtx, ps)
            );
            $projectsPageSessionHandler = function (info) {
                $('#content').html(
                    projects_view.render(cfg, info.userCtx, ps)
                );
            };
            session.on('change', $projectsPageSessionHandler);
        });
    };
    exports.$cleanupProjectsPage = function () {
        if ($projectsPageSessionHandler !== null) {
            session.removeListener('change', $projectsPageSessionHandler);
        }
    };


    exports.$settingsPage = function () {
        var cfg = settings.$get();
        $('#content').html( require('./views/settings').render(cfg) );
        $('#navigation').html(
            require('hbt!../templates/navigation')({
                settings: true
            })
        );
    };


    exports.$signupPage = function () {
        var username, password;
        var login_form = $('#login-form');

        if (login_form.length) {
            username = $('#login_username', login_form).val();
            password = $('#login_password', login_form).val();
        }
        $('#content').html(
            require('./views/signup').render(username, password)
        );
        $('#navigation').html(
            require('hbt!../templates/navigation')({})
        );
        $('#signup_username').focus();
    };


    exports.$templatesPage = function () {
        var templates_view = require('./views/templates');

        $('#content').html( templates_view.render() );
        $('#navigation').html(
            require('hbt!../templates/navigation')({
                templates: true
            })
        );
        // fetch template list from couchdb
        var vurl = 'api/_design/dashboard/_view/templates';
        couchr.get(vurl, {include_docs: true}, function (err, data) {
            if (err) {
                // TODO: show error message to user
                return console.error(err);
            }
            var el = templates_view.renderList(data);
            $('#templates-list').html(el);
        });
    };

});
