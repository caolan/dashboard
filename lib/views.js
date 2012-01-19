

exports.by_active_install =  {
     map: function (doc) {
        if (!doc.type || doc.type !== 'install' ) return;
        if (doc.removed) return;
        emit(doc.dashboard_title, null);
     }
}