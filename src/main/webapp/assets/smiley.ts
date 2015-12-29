//
// smiley
//
// @author Kazuhiko Arase
//
'use strict';

namespace wschat {

  declare type StrMap = { [name : string] : string };

  interface SmileyHandler {
    text : (s : string) => void,
    smiley : (s : string, dataUrl : string) => void
  }

  var applySmileys = function(s : string, handler : SmileyHandler) {
    var re = /^\w+$/;
    var start = 0;
    while (start < s.length) {
      var found = false;
      var pos = s.length;
      var key = '';
      var i : number;
      for(var k in map) {
        if ( (i = s.indexOf(k, start) ) != -1 && i < pos) {
          if (i > 0 && s.substring(i - 1, i + 1).match(re) ) {
            continue;
          } else if (i + k.length < s.length && 
              s.substring(i + k.length - 1, i + k.length + 1).match(re) ) {
            continue;
          }
          key = k;
          pos = i;
          found = true;
        }
      }
      if (!found) {
        break;
      }
      handler.text(s.substring(start, pos) );
      handler.smiley(key, 'data:image/png;base64,' + map[key]);
      start = pos + key.length;
    }
    handler.text(s.substring(start) );
  };
  var createSmiley = function($target : JQuery, key : string) {
    return $('<img/>').attr('src', 'data:image/png;base64,' + map[key]).
      on('click', function(event) {
        $target.trigger('textinput', {text: key});
      });
  };
  var getSmileys = function() {
    var $target = $('<div></div>');
    $target.append(createSmiley($target, ':)') );
    return $target;
  };

  var map = function() {

    var images : StrMap = {
      "smile":"iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAKBJREFUeNq0VFsOgCAMo8QLyP3PqEeoEhIzoOADXMKH3Va2qgU31wsKDK3i5SFBK58R+5dE3Yv9AFHV5yXRynRU6BzVmlchAIdQKB8Sbut6mg2FH9CqWnX6ZD+S7Ulgkq78O+JzxG1d9oLOAs6cDJO4UK1ZflvNzvBAs6jLHWHMK7eBAalutk0Ks+6BIsHeOg3vg5rsi3vgzhzx1WkPAQYASHs2Jkuf3PAAAAAASUVORK5CYII="
    };

    var codes : StrMap = {
      "smile": ":) :-)"
    };

    var map : StrMap = {};
    for (var name in images) {
      var image = images[name];
      var names = codes[name].split(/\s+/g); 
      for (var i = 0; i < names.length; i += 1) {
        map[names[i]] = image;
      }
    }
    return map;
  }();

  export var smiley = {
    applySmileys : applySmileys,
    getSmileys : getSmileys
  };
}
