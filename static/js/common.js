var dashboard_db_name = 'dashboard';
jQuery.couch.urlPrefix = '_couch';



function oneUrl(location) {
    return location.protocol + '//' + location.host ;
}

function dbRoot(location) {
    return location.protocol + '//' + location.host + '/';
}




function addDashboardUrl(data) {
    var dashboardUrl = oneUrl(window.location);
    data.gardens = _.map(data.gardens, function(row) {
       row.url = row.url + '?dashboard=' + dashboardUrl;
       return row;
    });
    return data;
}


function adjustUIforUser(info, callback) {
        var isAdmin = userType.isAdmin(info);
        if (!isAdmin) {
            $('.admin-only').hide();
        } else {
            $('.admin-only').show();
        }


        if (callback) callback();


}


function getDBSecurity(dbName, callback) {
    $.couch.db(dbName).getDbProperty("_security", {
      success: function(r) {
          callback(null, r);
      }
  });
}


function addDBReaderRole(dbName, role, callback) {
  getDBSecurity(dbName, function(err, sec) {
      console.log(sec);
      if (!sec.admins) {
          sec = {"admins":{"names":[],"roles":[]},"members":{"names":[],"roles":[]}};
      }

      sec.members.roles.push(role);
      $.couch.db(dbName).setDbProperty("_security", sec, {
          success : function() {
              callback(null);
          }
      });
  });
}

function updateStatus(msg, percent, complete) {
    console.log(msg, percent, complete);
    $('.install-info h4').text(msg);
    $('.install-info .bar').css('width', percent);
    if (complete) {
        $('.install-info .progress').removeClass('active');
    }
}



$(function() {
    $('#garden-navigation').tooltip({placement: 'right'});
    $('.help').tooltip({placement: 'bottom'});


    $('.modal .cancel').live('click', function() {
        $(this).parent().parent().modal('hide');
    });
    $('.logout').live('click', function() {
        session.logout(function(err){
            if (err) return alert('There was a problem logging out');
            adjustUIforUser({});
        });
    });

    // version info
    $.getJSON("./_info",  function(data) {
        $('footer span.version').text(data.version);
    })



});