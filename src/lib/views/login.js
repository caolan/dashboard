define([
    'exports',
    'require',
    'jquery',
    './utils',
    '../remote/session',
    'hbt!../../templates/login'
],
function (exports, require, $) {

    var session = require('../remote/session'),
        vutils = require('./utils');


    exports.render = function (next, /*opt*/username, /*opt*/password) {
        var el = $(require('hbt!../../templates/login')({
            username: username,
            password: password
        }))
        $('#login-form', el).submit( exports.$submitForm(next) );
        return el;
    };

    exports.getValidationErrors = function (form) {
        var username_input = $('#login_username');
        var password_input = $('#login_password');

        var errs = [];
        if (!username_input.val()) {
            errs.push({
                input: username_input,
                control_group: username_input.parents('.control-group'),
                text: 'Required'
            });
        }
        if (!password_input.val()) {
            errs.push({
                input: password_input,
                control_group: password_input.parents('.control-group'),
                text: 'Required'
            });
        }
        return errs;
    };

    // this can have side-effects, and the main view can bind this function
    // without them executing (until the parent object is inserted into the dom)
    // and so remain 'safe' -- BUT when editing a provided DOM element, we don't
    // know if it's been put into the DOM or not already, so any event binding
    // *would* be a side-effect -- this time it's only safe because we're
    // CREATING a new DOM element and therefore KNOW it's not in the main
    // document yet.

    exports.$submitForm = function (next) {
        return function (ev) {
            ev.preventDefault();
            var form = this;

            // clear validation/error messages
            vutils.clearValidation(form);

            var errs = _.map(
                exports.getValidationErrors(form),
                vutils.showValidationError
            );
            if (errs.length) {
                return false;
            }

            var vals = vutils.serializeObject(form);
            $('#login_submit').button('loading');

            session.$login(vals.name, vals.password, function (err, res) {
                $('#login_submit').button('reset');

                if (err) {
                    return vutils.showError(
                        $('fieldset', form),
                        vutils.wrapNetworkError(err)
                    );
                }
                window.location = next ? decodeURIComponent(next): '#/';
            });
            return false;
        };
    };

});
