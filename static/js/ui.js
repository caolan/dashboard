var _ = require('underscore')._;
var handlebars = require('handlebars');
var garden_urls = require('lib/garden_urls');
var couch = require('db');
var current_db = couch.current();


var show = function(what, context) {
    if (!context) context = {};
    $('.nav li').removeClass('active');
    $('.nav li.' + what).addClass('active');
    $('.main').html(handlebars.templates[what + '.html'](context, {}));
} 


function oneUrl(location) {
    return location.protocol + '//' + location.host + location.pathname;
}

function dbRoot(location) {
    return location.protocol + '//' + location.host + '/';
}


function getApps(callback) {
    
    current_db.getView('garden-dashboard', 'by_active_install', {include_docs: true}, function(err, response) {
        if (err) {
            return alert(err);
        }
        var data = {};
        data.apps = _.map(response.rows, function(row) {

            // we should verify these by checking the db and design docs exist.

            var app_data = row.doc;
            return {
                id   : app_data._id,
                img  : 'http://placehold.it/210x150',
                name : app_data.dashboard_title,
                db   : app_data.installed.db,
                start_url : garden_urls.get_launch_url(app_data)
            }
        });
        callback(data);
    });
}


function showApps() {
    show('apps');

    getApps(function(data) {
        if (!data.apps || data.apps.length === 0) {
            $('.message').html(handlebars.templates['no_apps_message.html']({}, {}));
            return;
        }

        $('.app').append(handlebars.templates['app_list.html'](data, {}));


        $('ul.app .thumbnail').click(function(){

            var name = $(this).data('name');
            var link = $(this).parent().attr('href');
            // animate the top bar, giving user context
            

            $('.navbar .nav > li > a').hide(700);

            setTimeout(function(){
                $('.navbar-inner a.brand').text(name);
                $('#garden-navigation').show(400);
            }, 200)

            setTimeout(function() {
                window.location = link;
            }, 700);


            return false;


        });



        $('ul.app .thumbnail i')
           .twipsy({placement: 'bottom'})
            .click(function() {
                $('.twipsy').hide(); // seems to linger
                var id = $(this).data('id');
                try {
                   router.setRoute('/apps/info/' + id);
                } catch(e) {
                    console.log(e);
                }                
                return false;
            })




    });
}


function getMarkets(callback) {
    var data = {};
    data.gardens = [
        {
            name : "IrisCouch Market",
            url : "https://garden.iriscouch.com"
        }
    ];
    var dashboardUrl = oneUrl(window.location);
    data.gardens = _.map(data.gardens, function(row) {
       row.url = row.url + '?dashboard=' + dashboardUrl;
       return row;
    });

    callback(data);
}


function showMarkets() {
    show('markets');
    getMarkets(function(data) {
        $('ul.gardens').append(handlebars.templates['garden_details.html'](data, {}));
    })

    $('.add-market').click(function() {
        $('.add-market').hide();
        $('.new-market').show(500);
    });

    $('.cancel').click(function() {
        $('.add-market').show();
        $('.new-market').hide(500);
    });


}

function viewApp(id) {

    $('.nav li').removeClass('active');
    $('.nav li.apps' ).addClass('active');


    current_db.getDoc(id, function(err, doc) {


         doc.installed_text = moment(new Date(doc.installed.date)).calendar();

        $('.main').html(handlebars.templates['app_details.html'](doc, {}));


        $('.form-actions .btn').twipsy({placement: 'bottom'});

        var app_db = couch.use(doc.installed.db);
        app_db.info(function(err, data) {
            var nice_size = garden_urls.formatSize(data.disk_size)
            $('#db-size').text(nice_size);
        })



        $('.edit-title').blur(function() {
            doc.dashboard_title = $(this).text();
            current_db.saveDoc(doc, function(err, response){
               if (err) return alert('could not save');
               doc._rev = response.rev;
            });
        })


        $('.modal .cancel').click(function() {
            console.log('click');
            $(this).parent().parent().modal('hide');
        });

        $('#delete-final').click(function() {
            $(this).parent().parent().modal('hide');
            couch.deleteDatabase(doc.installed.db, function(err, response) {
               if (err) {
                   return alert('Could not delete db');
               }
               current_db.removeDoc(doc, function(err, response) {
                    // go to the dashboard.
                    router.setRoute('/apps');
               });
            });


        });


    });



    
}



function showSync() {
    show('sync');




    // we need the following info to figure best option
    //console.log(System.os);
    //console.log(System.check_plugin('java'));

    $('.other').click(function() {
        $('table.platform-installs').show();
        $(this).hide();
        return false;
    });
}

function userTableShow() {
    var val = $('input:radio[name=userMode]:checked').val();
     if (val === 'multiUser') $('.multiUser').show();
     else $('.multiUser').hide();
}

function showSettings() {
    show('settings')
    userTableShow();
    $('input:radio[name=userMode]').click(function() {
          userTableShow();
    });
}

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.href);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}


function installApp() {
    $('.nav li').removeClass('active');
    $('.nav li.apps' ).addClass('active');


    var context = {
        app_url : getParameterByName('app_url'),
        app_name : getParameterByName('app_name'),
        is_auth : true
    };

    console.log(context);

    $('.main').html(handlebars.templates['install.html'](context, {}));
}



var routes = {
  '/apps'   : showApps,
  '/apps/info/:db' : viewApp,
  '/apps/install' : installApp,
  '/markets': showMarkets,
  '/sync'   : showSync,
  '/settings'   : showSettings
};


var router = Router(routes).init('/apps');





$(function() {
    $('.help').twipsy({placement: 'bottom'});


    //query feeds
    var data = [];
    data.feeds = [
        {
            app : 'http://placehold.it/20x20',
            message : 'You added Get Milk',
            date: '2012-01-13T09:24:17Z'
        }

    ]
    $('.feed').append(handlebars.templates['feed_details.html'](data, {}));


    $('.timeago').each(function() {
       var textTime = $(this).attr('title');
       var date = Date.parse(textTime);
       var text = moment(date).fromNow();
       $(this).text(text);
       $(this).attr('title', moment(date).calendar());

    }).twipsy({placement: 'right'});

}) 

       