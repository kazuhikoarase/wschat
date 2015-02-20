//
// base-client
//
// @author Kazuhiko Arase
//

var wsbase = function(opts) {

  'use strict';

  var ws = null;

  var console = {
    log: function(msg) {
      if (location.hostname == 'localhost') {
        window.console.log(msg);
      }
    }
  };

  var actions = {};

  actions.login = function(data) {
    console.log('logined');
  };

  var onopen = function(event) {
    console.log(event.type);
    send({
      action: 'login',
      uid: opts.uid,
      lang: navigator.language
    });
  };

  var onclose = function(event) {
    console.log(event.type);
    ws = null;
    reopen();
  };

  var onmessage = function(event) {
    var data = JSON.parse(event.data);
    console.log(JSON.stringify(data, null, 2) );
    var action = actions[data.action];
    if (action) {
      action(data);
    }
  };

  var onerror = function(event) {
    console.log(event.type);
  };

  var initWS = function() {
    var ws = new WebSocket(opts.url);
    ws.onopen = onopen;
    ws.onclose = onclose;
    ws.onmessage = onmessage;
    ws.onerror = onerror;
    return ws;
  };

  var reopen = function() {
    window.setTimeout(function() {
      if (navigator.onLine) {
        ws = initWS();
      } else {
        reopen();
      }
    }, 5000);
  };

  ws = initWS();

  var send = function(data) {
    if (ws == null) {
      return;
    }
    ws.send(JSON.stringify(data) );
  };

  var $ui = $('<div></div>');

  return $ui;
};
