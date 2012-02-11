/**
 * Rewrite settings to be exported from the design doc
 * {from: '/*', to: '../../../*', query : {base_url : '*'}}
 */

module.exports = [

    {from: '/_couch', to: '../../../'},
    {from: '/_couch/', to: '../../../'},
    {from: '/_couch/*', to: '../../../*'},

    {from: '/static/*', to: 'static/*'},
    {from: '/install', to: '_show/install'},
    {from: '/', to: 'index.html'},
    {from: '/apps', to: '_show/redirectRoot'},
    {from: '/_info', to: '_show/configInfo/_design/dashboard'},
    
    {from: '/:db/_design/:ddoc/_rewrite', to: '../../../:db/_design/:ddoc/_rewrite/'},
    {from: '/:db/_design/:ddoc/_rewrite/*', to: '../../../:db/_design/:ddoc/_rewrite/*'},
    {from: '/:db/_design/:ddoc/*', to: '../../../:db/_design/:ddoc/*'}
];
