'use strict';
namespace wschat.client {

  export var createNotificationManager =
      function(opts : ChatOptions, message : () => string) {
    var win : any = window;
    var ntf : any = null;
    var init = function() {
      if (win.Notification && win.Notification.permission != 'granted') {
        win.Notification.requestPermission(function (permission : string) {
          if (win.Notification.permission != permission) {
            win.Notification.permission = permission;
          }
        });
      }
    };
    var notify = function(title : string, body : string) {
      if (win.Notification && win.Notification.permission == 'granted') {
        if (ntf != null) {
          return;
        }
        var open = function() {
        };
        var close = function() {
          ntf = null;
        };
        var options : any = {};
        if (opts.icon) {
          options.icon = opts.icon;
        }
        ntf = new win.Notification(message(), options);
        ntf.onshow = function() {
          open();
        };
        ntf.onclick = function() {
          window.focus();
          close();
        };
        ntf.onclose = function() {
          close();
        };
      }
    };
    var close = function() {
      if (ntf != null) {
        ntf.close();
      }
//      window.focus();
    };
    init();
    return {
      notify: notify,
      close: close
    };
  }
}
