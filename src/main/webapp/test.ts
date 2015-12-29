$(function() {
  var buildUrl = function(path : string) {
    var url = location.href;
    var i1 = url.indexOf(':');
    var i2 = url.lastIndexOf('/');
    return (location.protocol == 'https:'? 'wss' : 'ws') +
      url.substring(i1, i2) + path;
  };

  var uid = location.hash? location.hash.substring(1) : 'testuser001';
  var url = buildUrl('/wschat');
  $('#placeHolder').append(wschat.createChatClient({
    uid: uid,
    url: url,
    fileuploadUrl: 'wschat-file',
//    notifySound: 'assets/chat.m4a',
//    notifySoundVolume: 0.1,
    inputAssist: function() {
      return wschat.smiley.getSmileys();
    },
    decorator: function($target) {
      var s = $target.text();
      $target.text('');
      wschat.smiley.applySmileys(s, {
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
