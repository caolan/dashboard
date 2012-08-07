define([
    'exports',
    'require',
    'jquery',
    'async',
    './utils',
    '../remote/session',
    '../remote/users',
    'hbt!../../templates/signup'
],
function (exports, require, $) {

    var tmpl = require('hbt!../../templates/signup'),
        session = require('../remote/session'),
        users = require('../remote/users'),
        vutils = require('./utils'),
        async = require('async');


    exports.render = function (username, password) {
        var el = $(tmpl({
            username: username,
            password: password
        }));
        $('#signup-form', el).submit( exports.$submitForm );
        return el;
    };

    exports.getValidationErrors = function (form) {
        var username_input  = $('#signup_username', form);
        var email_input     = $('#signup_email', form);
        var password_input  = $('#signup_password', form);

        var errs = [];
        var required_inputs = [username_input, email_input, password_input];

        _.each(required_inputs, function (input) {
            if (!input.val()) {
                errs.push({
                    input: input,
                    control_group: input.parents('.control-group'),
                    text: 'Required'
                });
            }
        });
        return errs;
    };

    exports.$submitForm = function (ev) {
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

        var v = vutils.serializeObject(form);
        $('#signup_submit').button('loading');

        async.series([
            session.$logout,
            async.apply(users.$create, v.name, v.password, {email: v.email}),
            async.apply(session.$login, v.name, v.password)
        ],
        function (err) {
            $('#signup_submit').button('reset');
            if (err) {
                // TODO: roll-back user creation ?
                if (err.status === 409 || err.status === 404) {
                    err = new Error('User already exists');
                }
                vutils.showError(
                    $('fieldset', form),
                    vutils.wrapNetworkError(err)
                );
            }
            else {
                window.location = '#/';
            }
        });

        return false;
    };

});
