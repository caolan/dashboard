define([
    'exports',
    'require',
    'lodash',
    'director',
    './views/projects',
    './views/templates',
    './views/settings',
    './views/sessionmenu',
    './views/login',
    './views/signup',
    './projects',
    './session'
],
function (exports, require, _) {

    var director = require('director'),
        projects = require('./projects'),
        settings = require('./settings'),
        session = require('./session');


    exports.routes = {
        '/':                require('./views/projects'),
        '/templates':       require('./views/templates'),
        '/settings':        require('./views/settings'),
        '/login':           require('./views/login'),
        '/login/:next':     require('./views/login'),
        '/signup':          require('./views/signup')
    };

    exports.init = function () {
        var router = new director.Router(exports.routes);
        router.init();

        if (!window.location.hash || window.location.hash === '#') {
            window.location = '#/';
            $(window).trigger('hashchange');
        }
        projects.saveLocal();
        settings.saveLocal();

        session.info();
        session.on('change', function (data) {
            if (_.include(data.userCtx.roles, '_admin')) {
                $(document.body).addClass('is-admin');
            }
            else {
                $(document.body).removeClass('is-admin');
            }
            require('./views/sessionmenu')(data);
        });
    };

});
