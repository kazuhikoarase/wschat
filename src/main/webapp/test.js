$(function() {
  
  var mobile = !!navigator.userAgent.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i);
  if (mobile) {
    $('HEAD').prepend('<meta name="viewport" content="width=device-width,' +
      'initial-scale=1, minimum-scale=1, maximum-scale=1" />');
  }

  var buildUrl = function(path) {
    var url = location.href;
    var i1 = url.indexOf(':');
    var i2 = url.lastIndexOf('/');
    return (location.protocol == 'https:'? 'wss' : 'ws') +
      url.substring(i1, i2) + path;
  };

  var uid = location.hash? location.hash.substring(1) : 'testuser001';
  var url = buildUrl('/wschat');
  $('#placeHolder').append(wschat.client.createChatClient({
    uid: uid,
    url: url,
    mobile: !!navigator.userAgent.match(/Android|iPod|iPhone|iPad/i),
    fileuploadUrl: 'wschat-file',
//    notifySound: 'assets/chat.m4a',
//    notifySoundVolume: 0.1,
    inputAssist: function() {
      return wschat.client.smiley.getSmileys();
    },
    decorator: function($target) {
      var s = $target.text();
      $target.text('');
      wschat.client.smiley.applySmileys(s, {
        text: function(text) {
          $target.append($('<span></span>').text(text) );
        },
        smiley: function(text, data) {
          $target.append($('<img/>').
              attr('src', data).
              attr('title', text) );
        }
      });
    }
  }) );
});
