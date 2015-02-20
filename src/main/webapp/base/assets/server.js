//
// base-server
//
// @author Kazuhiko Arase
//

(function() {

  'use strict';

  var $ = {
    each: function(it, f) {
      if (typeof it.splice == 'function') {
        for (var i = 0; i < it.length; i += 1) {
          f(i, it[i]);
        }
      } else {
        for (var k in it) {
          f(k, it[k]);
        }
      }
    }
  };

  var console = {
    log: function(msg) {
      $logger.info(msg);
    }
  };

  var sync = function(lock, sync) {
    Packages.ws.ISync.sync.sync(lock,
        new Packages.ws.ISync({ sync: sync } ) );
  };

  var send = function(data, uid) {
    var msg = JSON.stringify(data);
    sync($session, function() {
      $session.getBasicRemote().sendText(msg);
    } );
  };

  var actions = {};

  actions.login = function(data) {
    user = { uid: data.uid };
    // just echo back.
    send(data);
  };

  var onOpen = function(config) {
    console.log('open/sid=' + $session.getId() );
  };

  var onClose = function(closeReason) {
    console.log('close/sid=' + $session.getId() );
  };

  var onMessage = function(msg) {
    msg = '' + msg;
    if (msg.length == 0) {
      return;
    }
    onMessageImpl(JSON.parse(msg) );
  };

  var onMessageImpl = function(data) {
    console.log(JSON.stringify(data, null, 2) );
    var action = actions[data.action];
    if (action) {
      action(data);
    }
  };

  return new Packages.ws.IServerEndpoint({
    onOpen: onOpen, onClose: onClose, onMessage: onMessage
  });
}() );
