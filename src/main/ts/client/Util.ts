'use strict';
namespace wschat.client {

  export var console = {
    log: function(msg : string) {
      if (location.hostname == 'localhost') {
        window.console.log(msg);
      }
    }
  };

  export var xhr = function(
      uploadProgressHandler? : EventListener,
      downloadProgressHandler? : EventListener) {
    return function() {
      var xhr = new XMLHttpRequest();
      if (uploadProgressHandler) {
        xhr.upload.addEventListener('progress', uploadProgressHandler, false);
      }
      if (downloadProgressHandler) {
        xhr.addEventListener('progress', downloadProgressHandler, false);
      }
      return xhr;
    };
  };

  export var replaceText = function(target : any, replacement : string) {
    var doc : any = document;
    if (doc.selection) {
      var range = doc.selection.createRange();
      if (range.parentElement() == target) {
        range.text = replacement;
        range.scrollIntoView();
      }
    } else if (typeof target.selectionStart != 'undefined') {
      var pos = target.selectionStart + replacement.length;
      target.value = target.value.substring(0, target.selectionStart) +
        replacement +
        target.value.substring(target.selectionEnd);
      target.setSelectionRange(pos, pos);
    }
  };

  export var timer = function(
      task : () => void, interval : number,
      reset? : () => void) {
    var tid : number = null;
    var start = function() {
      if (tid == null) {
        tid = window.setInterval(task, interval);
      }
    };
    var stop = function() {
      if (tid != null) {
        window.clearInterval(tid);
        tid = null;
      }
      if (reset) {
        reset();
      }
    };
    return {
      start: start,
      stop: stop
    };
  };

  export var trim = function(s : string) {
    return s.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  };

  export var rtrim = function(s : string) {
    return s.replace(/[\s\u3000]+$/g, '');
  };

  export var split = function(s : string, c : string) {
    var list : string[] = [];
    var start = 0;
    var index : number;
    while ( (index = s.indexOf(c, start) ) != -1) {
      list.push(s.substring(start, index) );
      start = index + c.length;
    }
    if (start < s.length) {
      list.push(s.substring(start));
    }
    return list;
  };

  export var fillZero = function(v : number, len : number) {
    var s = '' + v;
    while (s.length < len) {
      s = '0' + s;
    }
    return s;
  };

  export var messageFormat : any = function(msg : string) {
    for (var i = 1; i < arguments.length; i += 1) {
      var re = new RegExp('\\{' + (i - 1) + '\\}', 'g');
      msg = msg.replace(re, arguments[i]);
    }
    return msg;
  };

  export var formatNumber = function(num : number) {
    var n : string = '' + ~~num;
    var neg = n.indexOf('-') == 0;
    if (neg) {
      n = n.substring(1);
    }
    var f = '';
    while (n.length > 3) {
      f = ',' + n.substring(n.length - 3, n.length) + f;
      n = n.substring(0, n.length - 3);
    }
    f = n + f;
    return neg? '-' + f : f;
  };

  export var formatTime = function(t : number) {
    return ~~(t / 60 / 1000) + ':' +
      fillZero(~~(t / 1000) % 60, 2);
  };

  export var getTime = function() {
    return new Date().getTime();
  };

  export var trimToDate = function(d : number) {
    var date = new Date();
    date.setTime(d);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  export var getTimeLabel = function(d : number) {
    var date = new Date();
    date.setTime(d);
    return date.getHours() +':' +
        fillZero(date.getMinutes(), 2);
  };

  export var getTimestampLabel = function(d : number) {
    var date = new Date();
    date.setTime(d);
    return date.getFullYear() + '/' +
        (date.getMonth() + 1) + '/' +
        date.getDate() + ' ' +
        date.getHours() +':' +
        fillZero(date.getMinutes(), 2);
  };
}
