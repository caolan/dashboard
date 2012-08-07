define([
    'exports',
    'jquery'
],
function (exports, $) {

    exports.clearValidation = function (form) {
        // clear validation/error messages
        $('.error', form).removeClass('error');
        $('.help-inline', form).text('');
        $('.alert', form).remove();
        return form;
    };

    exports.showValidationError = function (e) {
        e.control_group.addClass('error');
        $('.help-inline', e.control_group).text(e.text);
        return e;
    };

    exports.serializeObject = function (form) {
        var arr = $(form).serializeArray();
        return _.foldl(arr, function (obj, f) {
            if (obj[f.name]) {
                throw new Error('conflicting name for field: ' + f.name);
            }
            obj[f.name] = f.value;
            return obj;
        },
        {});
    };

    exports.wrapNetworkError = function (err) {
        if (err.status === 0) {
            var e = new Error(
                'Request timed out, please check your connection.'
            );
            e.original = err;
            return e;
        }
        return err;
    };

    exports.showError = function (el, err) {
        $(el).prepend(
          '<div class="alert alert-error">' +
            '<a class="close" data-dismiss="alert">' +
              '&times;' +
            '</a>' +
            '<strong>Error</strong> ' +
            (err.message || err.toString()) +
          '</div>'
        );
        return el;
    };

    exports.$clearDropdowns = function () {
        $('[data-toggle="dropdown"]').parent().removeClass('open');
    };

    exports.$clearModals = function () {
        $('.modal').modal('hide').remove();
    };

    exports.$showModal = function (html) {
        exports.$clearModals();
        exports.$clearDropdowns();
        return $(html).appendTo(document.body).modal('show');
    };

});
