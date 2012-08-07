define([
    'exports',
    'require',
    'jquery',
    'lodash',
    '../remote/settings',
    'hbt!../../templates/settings'
],
function (exports, require, $, _) {

    var tmpl = require('hbt!../../templates/settings'),
        settings = require('../remote/settings');


    exports.render = function (cfg) {
        var el = $( tmpl({ settings: cfg }) );
        $('#settings-form', el).submit( exports.$submitForm );
        $('#settings-save-btn', el).click( exports.$submitForm );
        return el;
    };


    exports.$submitForm = function (ev) {
        ev.preventDefault();
        $('#settings-save-btn').button('loading');

        var cfg = {templates: {}, projects: {}};
        cfg.templates.sources = _.compact(
            $('#template_sources').val().split('\n')
        );

        var no_templates = $('#projects_show_no_templates').is(':checked');
        cfg.projects.show_no_templates = no_templates;

        var unknown = $('#projects_show_unknown_templates').is(':checked');
        cfg.projects.show_unknown_templates = unknown;

        settings.$update(cfg, function (err) {
            if (err) {
                // TODO: add message to admin status bar
                console.error(err);
                return;
            }
            $('#settings-save-btn').button('reset');
        });
        return false;
    };

});
