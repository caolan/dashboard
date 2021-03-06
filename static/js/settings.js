var dashboard_core = require('lib/dashboard_core');
var dashboard_links = require('lib/dashboard_links');
var _ = require('underscore')._;
var handlebars = require('handlebars');
var utils = require('lib/utils');
var session = require('session');
var users = require("users");
var semver = require("semver");
var revalidator = require("revalidator");
var password = require('lib/password');
var flattr = require('flattr');


$(function(){

    function viewApp(id) {
        console.log('view app');
        $.couch.db(dashboard_db_name).openDoc(id, {
            success: function(doc){
                doc.installed_text = moment(new Date(doc.installed.date)).calendar();
                doc.icon_src = dashboard_core.bestIcon96(doc);
                if (flattr.hasFlattr(doc)) {
                    var flattrDetails = flattr.getFlattrDetailsFromInstallDoc(doc);
                    doc.flattrLink = flattr.generateFlatterLinkHtml(flattrDetails);
                }

               $('#apps').html(handlebars.templates['app_details.html'](doc, {}));
               $('.flattr_link').tooltip({placement: 'bottom'});
               $('.form-actions .btn').tooltip({placement: 'bottom'});

               var showDBSize = function() {
                   $.couch.db(doc.installed.db).info({
                      success: function(data) {
                          var nice_size = dashboard_core.formatSize(data.disk_size);
                         $('#db-size').text(nice_size);
                      }
                  })
               };

               showDBSize();

               $('.edit-title').blur(function() {

                   doc.dashboard_title = $(this).text();
                   $.couch.db(dashboard_db_name).saveDoc(doc, {
                      success: function(results) {

                      }
                   });
               })




               $('#delete-final').click(function() {
                   $(this).parent().parent().modal('hide');

                   $.couch.db(doc.installed.db).drop({
                       success: function() {
                           $.couch.db(dashboard_db_name).removeDoc(doc,  {
                               success : function() {
                                   // go to the dashboard.
                                  router.setRoute('/apps');
                                  // reload page to reload the topbar
                                  window.location.reload();
                               }
                           });
                       }
                   })
               });


               function updateStatus(msg, percent, complete) {
                   $('.activity-info .bar').css('width', percent);
                   if (complete) {
                       $('.activity-info .progress').removeClass('active');
                   }
               }


               $('#compact-final').click(function(){
                   $('.activity-info').show();
                   updateStatus('Compacting', '50%', true);
                   $.couch.db(doc.installed.db).compact({
                      success : function(){
                          updateStatus('Done Compact', '100%', true);
                          setTimeout(function() {
                              $('.activity-info').hide();
                              showDBSize();

                          }, 3000);

                      }
                   });
               });


               $('#clone-app-start').click(function(){
                   $('#newAppName').val(doc.dashboard_title);
               });




               dashboard_core.getDBSecurity(doc.installed.db, function(err, security){
                   if (err) return console.log(err);

                   if (!security.members || !security.members.roles || security.members.roles.length == 0 ) {
                       security.access_type_public = true;
                   } else {
                       var actual = { roles: security.members.roles };
                       var admin  = { roles: ['_admin'] };
                       if (_.isEqual(actual, admin)) {
                           security.access_type_admins = true;
                       } else {
                           security.access_type_groups = true;
                       }
                   }
                   security.members.roles = _.without(security.members.roles, "_admin");
                   var cleaned_roles = [];
                   _.each(security.members.roles, function(role) {
                       if (role.indexOf('group.') === 0 ) {
                           cleaned_roles.push(role.substring(6));
                       }
                   });
                   security.members.roles = cleaned_roles;



                   $('.app_access').html(handlebars.templates['app_access.html'](security, {}));
                   if (security.access_type_groups) {
                       renderAppGroupTable(doc.installed.db);
                   }
                   configureRadioSelection(doc.installed.db);

               });



            }
        });
    }

    function renderAppGroupTable(db) {
        $('.group-table').show();
        configureRolesSelection('#group_access');
        $('#add-groups-to-app-final').on('click', function(){

            var groups = $('#group_access').val();
            groups = _.map(groups, function(group){ return 'group.' + group });

            saveAccessType(db, 'groups', groups, function(err, new_security) {
                //humane.info('access changed');
                //new_security.access_type_groups = true;
                //new_security.members.roles = _.without(new_security.members.roles, "_admin");
                //$('.app_access').html(handlebars.templates['app_access.html'](new_security, {}));
                //configureRolesSelection();
                //configureRadioSelection(doc.installed.db);
                window.location.reload();
            });
            return false;
        });
    }

    function configureRolesSelection(select) {

        if ($(select).hasClass('chzn-done')) return;


        getRoles(function(roles) {
           if (!roles || roles.length == 0) {
               $(select).hide();
           }  else {
               $(select).empty();
               _.each(roles, function(row) {
                   var option = $('<option>'+ row.key +'</option>');
                   $(select).append(option);
               });
               $(select).show().chosen({no_results_text: "No results matched"});

           }
        });
    }

    function configureRadioSelection(db) {
        $('.access_radio').on('click', function(){
             var access_type = $(this).val();

             if (access_type == 'admins' || access_type == 'public') {
                  $('.group-table').hide();
                  $('.group-table tbody tr').remove();
                  return saveAccessType(db, access_type, null, function(err){
                      humane.info('access changed');
                  });
             }
             else renderAppGroupTable(db);
        });
    }

    function saveAccessType(db, type, groups, callback) {
        if (type == 'admins'){
            return dashboard_core.onlyAdminDBReaderRole(db, callback);
        }
        if (type == 'public') {
            return dashboard_core.removeAllDBReaderRoles(db, callback);
        }
        if (type == 'groups') {
            return dashboard_core.addDBReaderRole(db, groups, callback);
        }
    }



    function showApps() {
        if ($('#apps table.apps').length > 0) return; // weird bug we are getting called twice. prevent re-render.
        $('#apps').html(handlebars.templates['apps.html']({}));

        dashboard_core.getInstalledApps(function(err, data) {
             $('.app-list-condensed').html(handlebars.templates['settings-apps.html'](data, {}));
        });

        // dashboard version info
        $.getJSON("./_info",  function(data) {
            var ourVersion = data.config.version;

            $('.update-board tr.dashboard td.installed-version').html(ourVersion);

            $.ajax({
                url :  "http://garden20.iriscouch.com/garden20/_design/dashboard/_show/configInfo/_design/dashboard?callback=?",
                dataType : 'json',
                jsonp : true,
                success : function(remote_data) {
                    var currentVersion = remote_data.config.version;
                    $('.update-board tr.dashboard td.available-version').html(currentVersion);
                    if (semver.lt(ourVersion, currentVersion )) {
                        $('.update-board tr.dashboard div.update-action').show();
                    }
                },
                error : function() {
                }
            });
        });


        dashboard_core.getInstalledAppsByMarket(function(err, apps) {
            _.each(apps, function(apps, location ) {
                var data = {
                    location: location,
                    apps : apps
                };
                $('.update-board').append(handlebars.templates['settings-app-updates.html'](data, {}));
                dashboard_core.checkUpdates(data, function(err, appVersions) {
                    _.each(appVersions.apps, function(app) {
                        if (app.value.availableVersion) {
                            $('.update-board tr.'+ app.id +' td.available-version').html(app.value.availableVersion);
                           if (app.value.needsUpdate) {
                               $('.update-board tr.'+ app.id +' div.update-action').show();
                           }
                        } else {
                            $('.update-board tr.'+ app.id +' td.available-version').html("Can't determine");
                        }

                    })
                });
            })
        });
    }

    function showOrdering() {
        $('#save-ordering-final')
            .attr('disabled', 'disabled')
            .on('click', function(){
                $(this).attr('disabled', 'disabled');

                var showing = [];
                var onDropdownMenu = [];
                $('#sortable1 li').each(function(i, entry) {
                   showing.push($(entry).data('id'));
                });
                $('#sortable2 li').each(function(i, entry) {
                    onDropdownMenu.push($(entry).data('id'));
                });

                console.log(showing, onDropdownMenu);
                dashboard_core.updateNavOrdering(showing, onDropdownMenu, function(err) {
                    if (err) return humane.error(err);
                    humane.info('Save complete');
                });
            });
        $( "#sortable1, #sortable2" ).empty().sortable({
            connectWith: ".connectedSortable",
            stop: function(event, ui) {
                $('#save-ordering-final').removeAttr('disabled');
            }
        }).disableSelection();

        dashboard_core.getTopbarEntries(function(err, rows) {
            _.each(rows, function(row) {
                if (row.key[0] === 0) return; // settings doc
                 if(row.doc.onDropdownMenu) {
                     $('#sortable2').append('<li class="ui-state-default" data-id="'+ row.id + '">' + row.key[2] + '</li>');
                 } else {
                     $('#sortable1').append('<li class="ui-state-default" data-id="'+ row.id + '">' + row.key[2] + '</li>');
                 }
            });
        });


    }


    $('.update-board  button.update-run-app').live('click',function(){
        var btn = $(this);
        btn.button('loading');
        var id = btn.data('id');
        dashboard_core.updateApp(id, function(err, app_data) {
            if (err) {
                return alert(err);
            } else {
                btn
                 .button('complete')
                 .addClass('disabled')
                 .attr('disabled', 'disabled');
                $('.' + id + ' .installed-version').html(app_data.kanso.config.version);
            }
        });


    });

    $('.update-board tr.dashboard .update-run').live('click',function(){
       var btn = $(this);
       btn.button('loading');
       $.couch.replicate('http://garden20.iriscouch.com/garden20', dashboard_core.dashboard_db_name, {
          success : function() {
              btn
                  .button('complete')
                  .addClass('disabled')
                  .attr('disabled', 'disabled');

          }
       }, {doc_ids : [ '_design/dashboard'  ] });
    });


    $('.front-page .btn-group .btn').on('click', function() {
        var type = $(this).data('type');
        $('.front-page .type').hide();
        $('.front-page .' + type).show();

    })
    $('.front-page .primary').on('click', function() {
        var btn = $(this);
        btn.button('loading');

        var frontpage_type =  $('.front-page .btn-group .btn.active').data('type');
        var showActivityFeed = $('.front-page input.showActivityFeed').attr('checked') === 'checked';
        var text;
        if (frontpage_type === 'markdown') {
            text = escape($('.front-page .markdown textarea').val());
        } else if (frontpage_type === 'html') {
            text = escape($('.front-page .html textarea').val());
        } else {
            text = escape($('#frontpage_link_url').val());
        }
        var started = new Date().getTime();
        $.ajax({
            url :  '_db/_design/'+ dashboard_core.dashboard_ddoc_name +'/_update/frontpage/settings?type=' + frontpage_type + '&showActivityFeed=' + showActivityFeed + '&text=' + text,
            type: 'PUT',
            success : function(result) {
                if (result == 'update complete') {
                    var now = new Date().getTime();
                    var minUItime = 1000 - (now - started);
                    if (minUItime > 0);
                    setTimeout(function() {
                        btn.button('reset');
                    }, minUItime);
                }
                else alert('update failed');

            },
            error : function() {

            }
        });

    });

    $('#short_urls').on('click', function() {
        if ($(this).attr('checked')==='checked') $('.short_urls').show(300);
        else $('.short_urls').hide(300);
    });
    $('#show_brand').on('click', function() {
            if ($(this).attr('checked')==='checked') $('.show_brand').show(300);
            else $('.show_brand').hide(300);
    });



    $('#brand_img').on('change', function() {
        var icon_name = $('#brand_img').val().split('\\').pop();
        if (icon_name) {
            $('#image-upload-form').ajaxSubmit({
                url:  "_db/settings",
                success: function(resp) {
                    var json_resp = JSON.parse(resp);
                    $('#attachmentRevision').val(json_resp.rev);
                    $('#brand_img_display').attr('src', '_db/settings/' + icon_name);
                }
            });

        }
    });


    function resetButtonAfter(btn, started) {
       var now = new Date().getTime();
       var minUItime = 1000 - (now - started);
       if (minUItime > 0);
       setTimeout(function() {
           btn.button('reset');
       }, minUItime);
    }





    $('#navigation .primary').click(function() {
        var btn = $(this);
        btn.button('loading');
        var started = new Date().getTime();
        var params = $('#navigation form.a').formParams();
        _.extend(params, $('#navigation form.c').formParams());

        var icon_name = $('#brand_img').val().split('\\').pop();
        if (icon_name) {
            params.icon_name = icon_name;
            var height = $('#brand_img_display').height();
            if (height > 25) return alert('your icon is greater than 25px.');
            params.icon_height = height;

            var width = $('#brand_img_display').width();
            params.icon_width = width;

        }


        $.ajax({
            url :  '_db/_design/'+ dashboard_core.dashboard_ddoc_name +'/_update/navigation/settings?' + $.param(params),
            type: 'PUT',
            success : function(result, textStatus, xmlHttpRequest) {
                if (result == 'update complete') {

                    var userBrowserid = 'false';
                    if (params.login_type == 'browserid') {
                        userBrowserid = 'true';
                    }
                    $.couch.config({
                        success : function(result) {
                            resetButtonAfter(btn, started);
                            window.location.reload();
                        }
                    }, 'browserid', 'enabled', userBrowserid );



                }
                else alert('update failed');

            },
            error : function() {

            }
        });
        return false;
    })

    function getLinks(callback) {
        console.log('get linkls');
        $.couch.db(dashboard_db_name).view('dashboard/links_only', {
            success: function(response) {
                callback(null, response.rows);
            }
         });
    }

    function showLinks() {
        getLinks(function(err, links) {
            $('.link-table').append(handlebars.templates['settings-links.html']({links: links}));
            $('.remove-link').on('click', function() {
                var id = $(this).data('id');
                var row = $(this).closest('tr');

                $.couch.db(dashboard_db_name).openDoc(id, {
                    success: function(doc) {
                        $.couch.db(dashboard_db_name).removeDoc(doc, {
                            success: function() {
                                row.remove();
                                window.location.reload();
                            }
                        });
                    }
                });

                return false;

            });
        });
    }

    function showSessions() {


        $('input[name=type]').on('click', function(){
            var selected = $('input[name=type]:checked').val();
            if (selected == 'internal') {
                $('.internal_session_method').show(300);
                $('.other_session_method').hide(300);
            } else {

                $('.internal_session_method').hide(300);
                $('.other_session_method').show(300);
            }
        });

        $('#sessions .primary').click(function(){
            var btn = $(this);
            btn.button('saving');
            var params = $('#sessions form').formParams();
            $.ajax({
                url :  '_db/_design/'+ dashboard_core.dashboard_ddoc_name +'/_update/sessions/settings?' + $.param(params),
                type: 'PUT',
                success : function(result, textStatus, xmlHttpRequest) {
                    if (result == 'update complete') {
                        window.location.reload();
                    }
                    else alert('update failed');

                },
                error : function() {
                    alert('update failed');
                }
            });
        });

    }

    function getAdmins(callback) {
        $.couch.config({
            success : function(data) {
                  var keys = [];
                  for(var i in data) if (data.hasOwnProperty(i)){
                    keys.push(i);
                  }

                if (callback) callback(keys);

            },
            error : function() {
                console.log('not an admin');
            }
        }, 'admins')

    }

    function showAdmins() {
        getAdmins(function(admins) {
            var data = {
                admins : admins
            };
            $('.admin-list').html(handlebars.templates['admins.html'](data, {}));
        });


    }

    function getRoles(callback) {

        $.couch.db(dashboard_db_name).view('dashboard/get_roles', {
            include_docs: true,
           success: function(response) {
               callback(response.rows);
           }
        });
    }

    function showRoles() {
        getRoles(function(roles) {
            var data = {
                roles : roles
            }
            $('.role-list').html(handlebars.templates['roles.html'](data, {}));
        });
    }


    function getUsers(callback) {
        $.couch.db('_users').allDocs({
            include_docs: true,
            startkey : 'org.couchdb.user:',
            endkey : 'org.couchdb.user_',
            success: function(response) {
               callback(null, response.rows);
            }
        });
    }


    function showUsers() {

        $('#add-user-dialog').on('shown', function(){
           // populate the roles
            configureRolesSelection('#new-user-roles');
            $('.password').val('');
        });


        getAdmins(function(admins) {
           var admins = _.map(admins, function(admin) { return 'org.couchdb.user:' + admin })
           getUsers(function(err, users) {
               var users_pure = [];
               _.each(users, function(user) {
                    if (_.contains(admins, user.id)) return;
                   user.just_name = user.id.substring(17);
                    user.groups = [];
                   _.each(user.doc.roles, function(role) {
                        if (role.indexOf('group.') === 0 ) {
                            user.groups.push(role.substring(6));
                        }
                   });
                   users_pure.push(user);
               });
               $('.users-list').html(handlebars.templates['users.html'](users_pure, {}));
               $('.help').tooltip({placement: 'bottom'});




           });
        });
    }



    $('.admin-delete').live('click', function(){
       var me = $(this);
       var name = $(this).data('name');

       users.delete(name, function(err) {
           if (err) return alert('could not delete.' + err);
           me.closest('tr').remove();
       });

    });

    $('#add-admin-final').live('click', function(){
        var username = $('#admin-name').val();
        var password = $('#admin-password').val();
        $('#add-admin-dialog').modal('hide');
        users.create(username, password,{roles : ['_admin']}, function(err) {
            if(err) return alert('Cant create admin');
            // admin created
            var data = {
                admins : [username]
            };
            $('.admin-list').append(handlebars.templates['admins.html'](data, {}));
            $('#admin-name').val('');
            $('#admin-password').val('');

        })
    });

    $('.generate-password').live('click', function(){
        var pass = password();
        $('.password').val(pass).trigger('change');
        return false;
    });


    function addUser(){
        var roles = $('#new-user-roles').val();
        roles = _.map(roles, function(role){ return 'group.' + role })
        var password = $('#user-password').val();
        if (password == null || password == '') roles.push('browserid');

        var properties = {
            roles : roles,
            fullname : $('#user-name').val()
        }

        users.create($('#user-email').val(), password, properties, function(err) {
            if (err) return console.log(err);
            $('#add-user-dialog').modal('hide');
            // so much cheating
            window.location.reload(); // fixme
        });
    }


    $('#add-user-final').live('click', function(){
        addUser();
    });

    $('#add-user-final-email').live('click', function(){
        addUser();
    });

    $('#user-email, #user-password, #user-name').live('change', function(){
        var mailto = generateAccountInfoMailto($('#user-email').val(), $('#user-password').val(), $('#user-name').val());
        $('#add-user-final-email').attr('href', mailto);
    });

    function generateAccountInfoMailto(email, password, name) {
        var data = {
            email : email,
            password: password,
            name : name
        }


        data.host = dashboard_links.hostRoot(window.location);
        data.login = data.host + $('#dashboard-topbar-session').data('login');

        var text =  handlebars.templates['accountEmail.txt'](data, {});

        //mailto:someone@example.com?subject=This%20is%20the%20subject&body=This%20is%20the%20body
        var subject = encodeURIComponent("New Account Created");


        return 'mailto:' + email + '?subject=' + subject + '&body=' + encodeURIComponent(text);
    }

    $('.user-delete').live('click', function(){
        var me = $(this);
        var _id = $(this).data('id');
        if (_id.indexOf('org.couchdb.user:') == 0) {
            _id = _id.substring(17);
        }


        users.delete(_id, function(err){
            if (err) return humane.error(err);
            me.closest('tr').remove();
            humane.info('user deleted');
        });
        return false;
    });


    $('#add-role-final').live('click', function() {
        var role = {
            type : 'role',
            name : $('#role-name').val()
        };
        $('#add-role-dialog').modal('hide');

        $.couch.db(dashboard_db_name).saveDoc(role, function(){
            role.key = role.name; // to keep the template rigt
            showRoles();
            $('#role-name').val('');
        })

    });


    $('.role-delete').live('click', function() {
       var me = $(this);
       var toDelete = {
           _id : $(this).data('id'),
           _rev : $(this).data('rev')
       };
       $.couch.db(dashboard_db_name).removeDoc(toDelete, {
           success: function() {
               me.closest('tr').remove();
           }
       })
    });

    $('a.add-link').on('click', function() {
        $(this).hide();
        $('#add-link').show(600);
        return false;
    });
    $('#add-link-final').on('click', function() {
        var link = $('#add-link').formParams();
        link.type = 'link';

        $.couch.db(dashboard_db_name).saveDoc(link, {
            success: function(response) {
                window.location.reload();
            }
        });

        return false;
    });
    $('#add-link-cancel').on('click', function() {
        $('#add-link').hide();
        $('a.add-link').show();
    });
    //var url = document.location.toString();
    //if (url.match('#')) {
    //    $('.nav.tabs a[href=#'+url.split('#')[1]+']').tab('show') ;
    //}

    // Change hash for page-reload
    $('.nav.tabs a').on('shown', function (e) {
        var tab = e.target.hash.split('#')[1];
        router.setRoute('/' + tab);
//        window.location.hash = '/' + tab;
    })
    function showTab(id) {
        $('#' + id).tab('show');
    }
    function showTab() {
        var url = document.location.toString();
        $('.nav.tabs a[href=#'+url.split('#/')[1]+']').tab('show') ;
    }
    var routes = {

      '/apps/:db' : function(app_id) {
          viewApp(app_id);
      },
      '/apps'   : function(){
          showApps();
      },
      '/frontpage'  : showTab,
      '/navigation' : showTab,
      '/sessions'   : function() {
          showTab();
          showSessions();
      },
      '/admins'     : function(){
          showTab();
          showAdmins();
      },
      '/groups'      : function(){
          showTab();
          showRoles();
      },
      '/links'      : function(){
          showTab();
          showLinks();
      },
      '/ordering'   : function() {
          showTab();
          showOrdering();
      },
      '/users'   : function() {
            showTab();
            showUsers();
      }
    };


    var router = Router(routes);
    router.init('/apps');
})




