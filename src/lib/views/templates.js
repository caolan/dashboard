define([
    'exports',
    'require',
    'jquery',
    'lodash',
    'couchr',
    './utils',
    '../remote/templates',
    '../remote/projects',
    'hbt!../../templates/templates',
    'hbt!../../templates/templates-list',
    'hbt!../../templates/templates-row',
    'hbt!../../templates/templates-create-project-modal',
    'hbt!../../templates/templates-project-progress-modal',
    'hbt!../../templates/templates-done-project-modal'
],
function (exports, require, $, _) {

    var tmpl = require('hbt!../../templates/templates'),
        templates = require('../remote/templates'),
        projects = require('../remote/projects'),
        vutils = require('./utils'),
        couchr = require('couchr');


    exports.render = function () {
        var el = $(tmpl({}));
        $('#templates-refresh-btn', el).click( exports.$doRefresh );
        return el;
    };

    exports.$showDoneModal = function (url) {
        var tmpl = require('hbt!../../templates/templates-done-project-modal');
        var m = vutils.$showModal(tmpl({ url: url }));
        // so if you press enter you go to desired url
        $('.btn-primary', m).focus();
    };

    exports.$showProgressModal = function () {
        var tmpl = require(
            'hbt!../../templates/templates-project-progress-modal'
        );
        vutils.$showModal(tmpl({}));
    };

    exports.$submitCreateProject = function (ddoc_id) {
        return function (ev) {
            ev.preventDefault();
            var name = $('#input-project-name', m).val();
            var m = exports.$showProgressModal();

            var bar = $('.progress .bar', m);
            var creator = projects.$create(name, ddoc_id, function (err, doc) {
                if (err) {
                    exports.$showProjectModal(ddoc_id, name);
                    vutils.showError($('.modal-body', m), err);
                    return;
                }
                var fn = function () {
                    exports.$showDoneModal(doc.url);
                };
                bar.one('transitionEnd', fn);
                bar.one('oTransitionEnd', fn);       // opera
                bar.one('msTransitionEnd', fn);      // ie
                bar.one('transitionend', fn);        // mozilla
                bar.one('webkitTransitionEnd', fn);  // webkit
            });
            creator.on('progress', function (value) {
                bar.css({width: value + '%'});
            });
            return false;
        };
    };

    exports.$showProjectModal = function (ddoc_id, db_name) {
        var tmpl = require(
            'hbt!../../templates/templates-create-project-modal'
        );
        var html = tmpl({
            ddoc_id: ddoc_id,
            db_name: db_name || '',
            template_td: $('tr[data-ddoc-id=' + ddoc_id + '] .name').html()
        });
        var m = vutils.$showModal(html);

        $('#input-project-name', m).focus();
        $('.btn-primary', m).click( exports.$submitCreateProject(ddoc_id) );
        $('form', m).submit( exports.$submitCreateProject(ddoc_id) );
    };

    exports.$doInstallTemplate = function (tr, doc) {
        return function (ev) {
            ev.preventDefault();
            var that = this;

            var progress = $('<div class="progress" />');
            var bar = $('<div class="bar" />').appendTo(progress);
            $(this).parents('td').html(progress);

            var installer = templates.$install(
                doc.source, doc.ddoc_id, function (err, tdoc) {
                    if (err) {
                        // TODO: show error message to user
                        return console.error(err);
                    }
                    var fn = function () {
                        //progress.replaceWith(btn);
                        // redraw row
                        tr.replaceWith( exports.renderRow(tdoc) );
                    };
                    bar.one('transitionEnd', fn);
                    bar.one('oTransitionEnd', fn);       // opera
                    bar.one('msTransitionEnd', fn);      // ie
                    bar.one('transitionend', fn);        // mozilla
                    bar.one('webkitTransitionEnd', fn);  // webkit
                }
            );
            installer.on('progress', function (value) {
                bar.css({width: value + '%'});
            });
            return false;
        };
    };

    exports.$doUninstallTemplate = function (tr, doc) {
        return function (ev) {
            ev.preventDefault();
            var that = this;

            $(that).button('loading');
            templates.$uninstall(doc.ddoc_id, function (err, tdoc) {
                if (err) {
                    // TODO: show error message to user
                    return console.error(err);
                }
                //$(that).button('reset');
                // redraw row
                tr.replaceWith( exports.renderRow(tdoc) );
            });
            return false;
        };
    };

    exports.renderRow = function (doc) {
        var tr = $(require('hbt!../../templates/templates-row')({
            doc: doc,
            upgradable: doc.installed &&
                doc.installed.dashboard.version < doc.remote.dashboard.version
        }));
        $('.template-upgrade-btn', tr).click(
            exports.$doInstallTemplate(tr, doc)
        );
        $('.template-install-btn', tr).click(
            exports.$doInstallTemplate(tr, doc)
        );
        $('.template-uninstall-btn', tr).click(
            exports.$doUninstallTemplate(tr, doc)
        );
        $('.template-create-btn', tr).click(function (ev) {
            ev.preventDefault();
            exports.$showProjectModal(doc.ddoc_id);
            return false;
        });
        return tr;
    }

    exports.renderList = function (data) {
        var el = $(require('hbt!../../templates/templates-list')({}));
        _.each(data.rows, function (r) {
            $('tbody', el).append( exports.renderRow(r.doc) );
        });
        return el;
    };

    exports.$doRefresh = function (ev) {
        ev.preventDefault();
        var that = this;

        $('#templates-list').html('');
        $(this).button('loading');

        var updator = templates.$update(function (err) {
            if (err) {
                // TODO: show error message to user
                return console.error(err);
            }
            var bar = $('#admin-bar-status .progress .bar');
            var fn = function () {
                // fetch template list from couchdb
                var vurl = 'api/_design/dashboard/_view/templates';
                couchr.get(vurl, {include_docs: true}, function (err, data) {
                    if (err) {
                        // TODO: show error message to user
                        return console.error(err);
                    }
                    $('#admin-bar-status .progress').fadeOut(function () {
                        var el = exports.renderList(data);
                        $('#templates-list').html(el);
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
        updator.on('progress', function (value) {
            $('#admin-bar-status .progress .bar').css({
                width: value + '%'
            });
        });
        return false;
    };

});
