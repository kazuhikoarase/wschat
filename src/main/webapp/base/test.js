$(function() {
  var buildUrl = function(path) {
    var url = location.href;
    var i1 = url.indexOf(':');
    var i2 = url.lastIndexOf('/');
    return (location.protocol == 'https:'? 'wss' : 'ws') +
      url.substring(i1, i2) + path;
  };
  var uid = location.hash? location.hash.substring(1) : 'testuser001';
  var url = buildUrl('/test');
  $('#placeHolder').append(wsbase({
    uid: uid,
    url: url,
  }));
});
