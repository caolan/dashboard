define([
    'exports',
    'require',
    'jquery',
    '../remote/session',
    'hbt!../../templates/sessionmenu'
],
function (exports, require, $) {

    var session = require('../remote/session');


    exports.render = function (info) {
        var el = $( require('hbt!../../templates/sessionmenu')(info) );
        $('.signout-link', el).click( exports.$doLogout );
        return el;
    };


    exports.$doLogout = function (ev) {
        ev.preventDefault();
        session.$logout();
        return false;
    };

});
