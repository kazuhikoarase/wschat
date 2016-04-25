'use strict';
namespace wschat.client {

  export var createSVGElement = function(tagName : string) {
    return $(document.createElementNS(
        'http://www.w3.org/2000/svg', tagName) );
  };

  export var createSVG = function(w : number, h : number) {
    return createSVGElement('svg').attr({
      version: '1.1',
      width: w, height: h,
      viewBox: '0 0 ' + w + ' ' + h
    });
  };

  var createControl = function() {
    return $('<span></span>').
      css('display', 'inline-block').
      css('cursor', 'default').
      on('mousedown', function(event) {
        event.preventDefault();
      });
  };
  export var createButton = function(label : string) {
    return createControl().
      addClass('wschat-button').
      css('float', 'right').
      text(label);
  };
  export var createDialogContent = function(
      dlg : Dialog, label : string, buttons : string[]) {
    var $content = $('<div></div>').
      append(createControl().
        css('margin-bottom', '4px').
        css('width', '200px').
        css('word-wrap', 'break-word').
        text(label) ).
      append($('<br/>') );
    $.each(buttons, function(i, button) {
      var $button = createButton(button).
        on('click', function(event) {
          $content.trigger('close', button);
          dlg.hideDialog();
        });
      $content.append($button);
      if (i > 0) {
        $button.css('margin-right', '2px');
      }
    });
    $content.append($('<br/>').css('clear', 'both') );
    return $content;
  };

  export var createMenuItem = function(label : string) {
    return $('<div></div>').
      addClass('wschat-menu-item').
      css('cursor', 'default').
      text(label).
      on('mousedown', function(event) {
        event.preventDefault();
      });
  };

  export var createMenu = function($parent : JQuery, factory : ($menu : JQuery) => void) {
    var $menu : JQuery = null;
    var showMenu = function($target : JQuery) {
      if ($menu != null) {
        hideMenu();
      }
      $menu = $('<div></div>').
        addClass('wschat-menu').
        addClass('wschat-mouse-enabled').
        css('position', 'absolute');
      factory($menu);
      $parent.append($menu).on('mousedown', function(event) {
        if ($(event.target).closest('.wschat-menu').length == 0) {
          hideMenu();
        }
      });
      var off = $target.offset();
      var x = off.left;
      var y = off.top + $target.height();
      $menu.css('left', x + 'px').
        css('top', y + 'px');
      return $menu;
    };
    var hideMenu = function() {
      if ($menu != null) {
        $menu.remove();
        $menu = null;
      }
    };
    return {
      showMenu: showMenu,
      hideMenu: hideMenu
    };
  };

  export var loadImage = function(
    $parent : JQuery, src : string, size : number,
    loadHandler : ($img : JQuery) => void
  ) {
    $parent.append($('<img/>').
      css('display', 'none').
      on('load', function(event) {
        var $img = fitImage($(this), size);
        $img.css('display', 'inline-block').remove();
        loadHandler($img);
      }).
      attr('src', src) );
  };

  var fitImage = function ($img : JQuery, size : number) {
    var w = $img.width();
    var h = $img.height();
    if (w > size || h > size) {
      if (w > h) {
        $img.css('width', size + 'px');
        $img.css('height', ~~(size / w * h) + 'px');
      } else {
        $img.css('width', ~~(size / h * w) + 'px');
        $img.css('height', size + 'px');
      }
    }
    return $img;
  };

  export var overwrap = function() {
    var overwrap = (p1 : number, p2 : number, q1 : number, q2 : number) =>
      !(q1 < p1 && q2 < p1 || p2 < q1 && p2 < q2);
    return function($u1 : JQuery, $u2 : JQuery) {
      var off1 = $u1.offset();
      var off2 = $u2.offset();
      return overwrap(
          off1.left, off1.left + $u1.outerWidth(),
          off2.left, off2.left + $u2.outerWidth()) &&
        overwrap(
          off1.top, off1.top + $u1.outerHeight(),
          off2.top, off2.top + $u2.outerHeight());
    };
  }();
}
