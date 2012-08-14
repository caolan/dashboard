define([
    'exports',
    'require',
    'jquery',
    'lodash',
    'couchr',
    './utils',
    '../remote/projects',
    '../remote/settings',
    '../remote/session',
    '../collections/projects',
    '../collections/templates',
    'hbt!../../templates/projects',
    'hbt!../../templates/projects-row',
    'hbt!../../templates/projects-delete-modal',
    'hbt!../../templates/projects-template-modal',
    'hbt!../../templates/projects-template-modal-list',
    'hbt!../../templates/projects-create-modal',
    'hbt!../../templates/projects-progress-modal',
    'hbt!../../templates/projects-done-modal'
],
function (exports, require, $, _) {

    var projects = require('../remote/projects'),
        settings = require('../remote/settings'),
        session = require('../remote/session'),
        t_collection = require('../collections/templates'),
        p_collection = require('../collections/projects'),
        vutils = require('./utils'),
        couchr = require('couchr');


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

    exports.$showDoneModal = function (url) {
        var tmpl = require('hbt!../../templates/projects-done-modal');
        var m = vutils.$showModal(tmpl({ url: url }));
        // so if you press enter you go to desired url
        $('.btn-primary', m).focus();
    };

    exports.$showProgressModal = function (title) {
        var tmpl = require(
            'hbt!../../templates/projects-progress-modal'
        );
        vutils.$showModal(tmpl({title: title}));
    };

    exports.$submitCreateProject = function (t) {
        return function (ev) {
            ev.preventDefault();
            var name = $('#input-project-name', m).val();
            var m = exports.$showProgressModal('Creating project...');

            var bar = $('.progress .bar', m);
            var creator = projects.$create(
                name, t.ddoc_id, function (err, doc) {
                    if (err) {
                        exports.$showCreateModal(t, name);
                        vutils.showError($('.modal-body', m), err);
                        return;
                    }
                    var fn = function () {
                        session.$infoCached(function (err, info) {
                            var cfg = settings.$get().projects;
                            var ps = projects.$get();

                            // redraw projects list
                            $('#content').html(
                                exports.render(cfg, info.userCtx, ps)
                            );

                            exports.$showDoneModal(doc.url);
                        });
                    };
                    bar.one('transitionEnd', fn);
                    bar.one('oTransitionEnd', fn);       // opera
                    bar.one('msTransitionEnd', fn);      // ie
                    bar.one('transitionend', fn);        // mozilla
                    bar.one('webkitTransitionEnd', fn);  // webkit
                }
            );
            creator.on('progress', function (value) {
                bar.css({width: value + '%'});
            });
            return false;
        };
    };

    exports.$showCreateModal = function (t, db_name) {
        var tmpl = require(
            'hbt!../../templates/projects-create-modal'
        );
        var html = tmpl({
            db_name: db_name || '',
            template: t
        });
        var m = vutils.$showModal(html);

        $('#input-project-name', m).focus();
        $('.btn-primary', m).click( exports.$submitCreateProject(t) );
        $('form', m).submit( exports.$submitCreateProject(t) );
    };

    exports.$showTemplateModal = function () {
        var el = $(require('hbt!../../templates/projects-template-modal')({}));
        vutils.$showModal(el);

        // fetch template list from couchdb
        var vurl = 'api/_design/dashboard/_view/templates';
        couchr.get(vurl, {include_docs: true}, function (err, data) {
            if (err) {
                // TODO: show error message to user
                return console.error(err);
            }
            var ts = _.map(data.rows, function (r) {
                return {
                    ddoc_id: r.doc.ddoc_id,
                    icon: t_collection.getIcon(r.doc, 96),
                    dashicon: t_collection.getDashIcon(r.doc)
                };
            });
            var ul = $(
                require('hbt!../../templates/projects-template-modal-list')({
                    templates: ts
                })
            );
            $('li', ul).click(function (ev) {
                ev.preventDefault();
                var ddoc_id = $(this).attr('rel');
                var tmpl = _.detect(ts, function (t) {
                    return t.ddoc_id === ddoc_id;
                });
                exports.$showCreateModal(tmpl);
                return false;
            });
            $('.modal-body', el).html(ul);
        });

        return el;
    };

    exports.$showDeleteModal = function (p, tr) {
        var el = $(require('hbt!../../templates/projects-delete-modal')({}));
        $('.btn-danger', el).click(function (ev) {
            ev.preventDefault();

            var that = this;
            $(that).button('loading');
            var val = $('[name=deleteRadios]:checked', el).val();

            function done(err) {
                vutils.clearValidation(el);
                if (err) {
                    vutils.showError($('.modal-body', el), err);
                    $(that).button('reset');
                    return;
                }
                else {
                    vutils.$clearModals();
                    $(tr).fadeOut('slow', function () {
                        $(tr).remove();
                    });
                }
            }

            if (val === 'all') {
                projects.$deleteDB(p, done);
            }
            else if (val === 'template') {
                projects.$deleteTemplate(p, done);
            }
            else {
                done(new Error('Unknown option: ' + val));
            }
            return false;
        });
        vutils.$showModal(el);
        return el;
    };


    exports.renderRow = function (userCtx, p) {
        var el = $(require('hbt!../../templates/projects-row')({
            is_admin: p_collection.isAdmin(userCtx, p),
            is_public: p_collection.isPublic(p),
            no_admins: p_collection.noAdminsDefined(p),
            project: p
        }));
        $('.actions a.delete-btn', el).click(function (ev) {
            ev.preventDefault();
            exports.$showDeleteModal(p, el);
            return false;
        });
        return el;
    };


    exports.render = function (cfg, userCtx, ps) {
        ps = exports.filterProjects(cfg, userCtx, ps);
        var el = $(require('hbt!../../templates/projects')({}));
        _.each(ps, function (p) {
            $('tbody', el).append( exports.renderRow(userCtx, p) );
        });
        // bind event handler to refresh button
        $('#projects-refresh-btn', el).click(
            exports.$doRefresh(cfg, userCtx)
        );
        $('#projects-add-btn', el).click(function (ev) {
            ev.preventDefault();
            exports.$showTemplateModal();
            return false;
        });
        return el;
    };


    exports.$doRefresh = function (cfg, userCtx) {
        return function (ev) {
            ev.preventDefault();

            var m = exports.$showProgressModal('Scanning for projects...');
            var bar = $('.progress .bar', m);

            var refresher = projects.$refresh(function (err) {
                if (err) {
                    // TODO: add error alert box to status area
                    return console.error(err);
                }
                var fn = function () {
                    // re-render project list
                    var ps = projects.$get();
                    $('#content').html( exports.render(cfg, userCtx, ps));

                    vutils.$clearModals();
                };
                // TODO: support browsers that don't provide transitionEnd!
                bar.one('transitionEnd', fn);
                bar.one('oTransitionEnd', fn);       // opera
                bar.one('msTransitionEnd', fn);      // ie
                bar.one('transitionend', fn);        // mozilla
                bar.one('webkitTransitionEnd', fn);  // webkit
            });

            refresher.on('progress', function (value) {
                bar.css({width: value + '%'});
            });
            return false;
        };
    };

});
