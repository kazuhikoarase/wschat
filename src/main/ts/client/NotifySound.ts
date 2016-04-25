'use strict';
namespace wschat.client {

  export var createNotifySound = function(opts : ChatOptions) {
    var win : any = window;
    if (opts.notifySound && win.Audio) {
      var loaded = false;
      var preloader = new win.Audio();
      preloader.src = opts.notifySound;
      preloader.addEventListener('canplay', function(event : EventListener) {
        loaded = true;
      });
      preloader.load();
      var buf : any[] = [];
      for (var i = 0; i < 4; i += 1) {
        buf.push({audio: new win.Audio(), startTime: 0});
      }
      return function() {
        if (loaded) {
          for (var i = 0; i < buf.length; i += 1) {
            var now = new Date().getTime();
            if (buf[i].startTime + preloader.duration * 1000 < now) {
              buf[i].startTime = now;
              var audio = buf[i].audio;
              audio.src = preloader.src;
              audio.loop = false;
              if (opts.notifySoundVolume) {
                audio.volume = +opts.notifySoundVolume;
              }
              audio.load();
              audio.play();
              break;
            }
          }
        }
      };
    } else {
      return function() {};
    }
  };
}
