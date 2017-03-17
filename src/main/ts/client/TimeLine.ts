'use strict';
namespace wschat.client {

  interface Point {
    x : number
    y : number
  }

  interface Rect extends Point {
    width : number
    height : number
  }

  interface LabelUI {
    setRect : (rect : Rect) => void
    setText : (text : string) => void
    setTitle : (title : string) => void
    setVisible : (visible : boolean) => void
    $ui : JQuery
  }

  interface StatusUI {
    setRect : (rect : Rect) => void
    setText : (text : string) => void
    setColor : (color : string) => void
    setTitle : (title : string) => void
    setVisible : (visible : boolean) => void
    setEditable : (editable : boolean) => void
    isEditable : () => boolean
    $ui : JQuery
  }

  interface StatusModel {
    status : TimeLineStatus
  }

  interface PickerModel {
    target : string
  }

  interface TimeLineUser {
    uid : string
    nickname : string
    self : boolean
  }

  interface TimeLineStatus {
    dataId : string
    uid : string
    timeFrom : string
    timeTo : string
    comment : string
    color? : string
    _cache? : TimeLineStatusCache
  }
  interface TimeLineStatusCache {
    timeFrom : number
    timeTo : number
    timeFormat : string
  }

  var timeToStr = function() {
    var numToStr = function(n : number, digit : number) {
      var s = '' + n;
      while (s.length < digit) {
        s = '0' + s;
      }
      return s;
    };
    return function(time : number) {
      var date = new Date();
      date.setTime(time);
      return numToStr(date.getFullYear(), 4) +
        numToStr(date.getMonth() + 1, 2) +
        numToStr(date.getDate(), 2) +
        numToStr(date.getHours(), 2) +
        numToStr(date.getMinutes(), 2);
    };
  }();

  var strToTime = function(str : string) {
    var date = new Date();
    date.setTime(0);
    date.setFullYear(+str.substring(0, 4) );
    date.setMonth(+str.substring(4, 6) - 1);
    date.setDate(+str.substring(6, 8) );
    date.setHours(+str.substring(8, 10) );
    date.setMinutes(+str.substring(10, 12) );
    return date.getTime();
  };

  var TimeFormat = {
    Time : 'Time',
    MonthDateTime : 'MonthDateTime',
    Full : 'Full'
  }

  var getTimeFormat = function(t1 : string, t2 : string) {
    if (t1.substring(0, 8) == t2.substring(0, 8) ) {
      return TimeFormat.Time;
    } else if (t1.substring(0, 4) == t2.substring(0, 4) ) {
      return TimeFormat.MonthDateTime;
    } else {
      return TimeFormat.Full;
    }
  };

  var formatTime = function(time : number, format : string = TimeFormat.Full) {
    var s = timeToStr(time);
    switch(format) {
    case TimeFormat.Time :
      return (+s.substring(8, 10) ) + ':' +
        s.substring(10, 12);
    case TimeFormat.MonthDateTime :
      return (+s.substring(4, 6) ) + '/' +
        (+s.substring(6, 8) ) + ' ' +
        (+s.substring(8, 10) ) + ':' +
        s.substring(10, 12);
    default :
      return s.substring(0, 4) + '/' +
        (+s.substring(4, 6) ) + '/' +
        (+s.substring(6, 8) ) + ' ' +
        (+s.substring(8, 10) ) + ':' +
        s.substring(10, 12);
    }
  };

  var intersect = function(rect1 : Rect, rect2 : Rect) {
    return !(
        rect1.x > rect2.x + rect2.width ||
        rect1.y > rect2.y + rect2.height ||
        rect1.x + rect1.width < rect2.x ||
        rect1.y + rect1.height < rect2.y);
  };

  export var createTimeLine = function(
    chat : Chat,
    util : ChatUtil
  ) : TimeLine {

    var style = {
      colHeaderHeight : 20,
      rowHeaderWidth : 120,
      bodyWidth : 600,
      bodyHeight : 240,
      cellHeight : 32,
      hourInPixel : 12,
      oddBgColor : '#f0f0f0'
    };

    var HOUR_IN_MILLIS = 3600000;

    var model = {
      timeOffset : -(new Date().getTime() - HOUR_IN_MILLIS * 12),
      userOffset : 0,
      users : [] as TimeLineUser[],
      statusMap : {} as { [ uid : string ] : TimeLineStatus[] },
      minTimeStep : 15 * 60000, // 15min
      days : [] as string[]
    };

    var createBlock = function() {
      return $('<div></div>').css('position', 'absolute');
    };

    var $colHeader = $('<div></div>').
      addClass('wschat-tt-colHeader').
      css('position', 'absolute').
      css('overflow', 'hidden').
      css('cursor', 'ew-resize').
      css('width', style.bodyWidth +  'px').
      css('height', style.colHeaderHeight + 'px');
    var $rowHeader = $('<div></div>').
      addClass('wschat-tt-rowHeader').
      css('position', 'absolute').
      css('overflow-x', 'hidden').
      css('overflow-y', 'auto').
      css('width', style.rowHeaderWidth +  'px').
      css('height', style.bodyHeight + 'px').
      on('scroll', function(event) {
        model.userOffset = -$rowHeader.scrollTop();
        update();
      });
    var $body = $('<div></div>').
      addClass('wschat-tt-body').
      css('position', 'absolute').
      css('overflow', 'hidden').
      css('cursor', 'move').
      css('width', style.bodyWidth +  'px').
      css('height', style.bodyHeight + 'px');

    var toFront = function(statusModel : StatusModel) {
      /*
      var statusList : TimeLineStatus[] = [];
      for (var i = 0; i < statusModel.user.statusList.length; i += 1) {
        if (statusModel.user.statusList[i].dataId != statusModel.status.dataId) {
          statusList.push(statusModel.user.statusList[i]);
        }
      }
      statusList.push(statusModel.status);
      statusModel.user.statusList = statusList;
      update();
      */
    };

    var editor = function() {

      var maxlength = 140;
      var $clip : JQuery = null;
      var $textfield : JQuery = null;
      var $label : JQuery;
      var statusModel : StatusModel;

      var beginEdit = function($status : JQuery) {
        var ttOff = $tt.offset();
        var off = $status.offset();
        $label = $status.children('.wschat-tt-label');
        $label.css('display', 'none');
        statusModel = $status.data('model');
        $textfield = createStatusEditor().
          attr('maxlength', '' + maxlength).
          css('position', 'absolute').
          css('left', (off.left - ttOff.left -
            style.rowHeaderWidth + 2) + 'px').
          css('top', (off.top - ttOff.top -
            style.colHeaderHeight + 2) + 'px').
          css('width', $status.innerWidth() + 'px').
          val(statusModel.status.comment).
          on('keyup', function(event) {
            switch(event.keyCode) {
            case 13 : // enter
              endEdit(true);
              break;
            case 27 : // esc
              endEdit(false);
              break;
            }
          });
        $clip = $('<div></div>').
          css('position', 'absolute').
          css('overflow', 'hidden').
          css({
            left : style.rowHeaderWidth + 'px',
            top : style.colHeaderHeight + 'px',
            width : style.bodyWidth + 'px',
            height : style.bodyHeight + 'px' });
        $clip.append($textfield);
        $tt.append($clip);
        editor.currentDataId = statusModel.status.dataId;
        window.setTimeout(function() {
          $textfield.focus();
          $(document).on('mousedown', doc_mousedownHandler);
        }, 0);
      };

      var endEdit = function(commit : boolean) {
        if ($textfield != null) {
          if (commit) {
            var value = $textfield.val();
            if (value.length > maxlength) {
              value = value.substring(0, maxlength);
            }
            $tt.trigger('updateUserData', {
              action : 'update',
              dataId : statusModel.status.dataId,
              userData : { comment : value } });
          }
          $label.css('display', '');
          $(document).off('mousedown', doc_mousedownHandler);
          $clip.remove();
          $textfield = null;
          editor.currentDataId = null;
        }
      };

      var doc_mousedownHandler = function(event : JQueryEventObject) {
        if ($(event.target).closest('.wschat-editor').length != 0) {
          return;
        }
        endEdit(true);
      };

      var editor = {
        currentDataId : null as string,
        beginEdit : function($status : JQuery) {
          endEdit(true);
          beginEdit($status);
        }
      };
      return editor;
    }();

    var tt_mousedownHandler = function(event : JQueryEventObject) {

      var mouseOp : MouseOp = createDefaultMouseOp();

      if ($(event.target).closest('.wschat-tt-status-picker').length == 1) {
        mouseOp = pickMouseOp;
      } else if ($(event.target).closest('.wschat-editor').length == 1) {
      } else if ($(event.target).closest('.wschat-tt-status').length == 1) {
        mouseOp = scrollMouseOp;
      } else if ($(event.target).closest('.wschat-tt-body').length == 1) {
        mouseOp = scrollMouseOp;
      } else if ($(event.target).closest('.wschat-tt-colHeader').length == 1) {
        mouseOp = zoomMouseOp;
      }

      mouseOp.mousedown(event);
      mouseOp.lastPageX = event.pageX;
      mouseOp.lastPageY = event.pageY;

      if ($(event.target).closest('INPUT').length == 0) {
        event.preventDefault();
      }

      var doc_mousemoveHandler = function(event : JQueryEventObject) {
        mouseOp.mousemove(event);
        mouseOp.lastPageX = event.pageX;
        mouseOp.lastPageY = event.pageY;
      };
      var doc_mouseupHandler = function(event : JQueryEventObject) {
        mouseOp.mouseup(event);
        $(document).off('mousemove', doc_mousemoveHandler).
          off('mouseup', doc_mouseupHandler);
      };
      $(document).on('mousemove', doc_mousemoveHandler).
        on('mouseup', doc_mouseupHandler);
    };

    var createColorMenuItem = function() {

      var colorMenu :  {
          showMenu: ($target: JQuery) => JQuery;
          hideMenu: () => void;
        } = null;
      var onColorChooser = false;

      var createColorChooser = function() {

        var border = 1;
        var rows = 3;
        var cols = 4;
        var gap = 2;
        var r = 12;
        var w = (r + border * 2) * cols + gap * (cols - 1);
        var h = (r + border * 2) * rows + gap * (rows - 1);

        var $body = $('<div></div>').
          css('position', 'relative').
          css('width', w + 'px').
          css('height', h + 'px');
        var strokeColor = '#666666';

        var createColorCell = function(x : number, y : number) {
          var h = ~~( (y * cols + x) / (rows * cols) * 360);
          var color = 'hsl(' + h + ',100%,80%)';
          return $('<div></div>').
            css('position', 'absolute').
            css('left', ( (gap + r + border * 2) * x) + 'px').
            css('top', ( (gap + r + border * 2) * y) + 'px').
            css('width', r + 'px').
            css('height', r + 'px').
            css('opacity', '0.5').
            css('border-width', border + 'px').
            css('border-style', 'solid').
            css('border-color', strokeColor).
            css('background-color', color).
            on('mouseover', function(event){
              $(this).css('border-color', 'hsl(' + h + ',100%,50%)');
            }).
            on('mouseout', function(event){
              $(this).css('border-color', strokeColor);
            }).
            on('click', function(event){
              $(this).trigger('colorSelect', {color : color});
            });
        };
        for (var y = 0; y < rows; y += 1) {
          for (var x = 0; x < cols; x += 1) {
            $body.append(createColorCell(x, y) );
          }
        }
        return $body;
      };

      var createColorMenu = function($target : JQuery) {
        return createMenu($target, function($menu) {
          $menu.append(createMenuItem('').
            css('background-color', '#ffffff').
            append(createColorChooser().
            on('colorSelect', function(event, data) {
              colorMenu.hideMenu();
              colorMenu = null;
              $menuItem.trigger('colorSelect', data);
            }) ) );
          });
      };

      var $menuItem = createMenuItem(chat.messages.COLOR).
        on('mousedown', function(event) {
          event.stopImmediatePropagation();
        } ).
        on('mouseover', function(event) {
          if (colorMenu == null) {
            colorMenu = createColorMenu($(this) );
            colorMenu.showMenu($(this) ).
              css('left', ($(this).outerWidth() - 1) + 'px').
              css('top', '-1px').
              on('mouseover', function(event) {
                onColorChooser = true;
              } ).
              on('mouseout', function(event) {
                onColorChooser = false;
              } );
          }
        } ).
        on('mouseout', function(event) {
          callLater(function() {
            if (colorMenu != null && !onColorChooser) {
              colorMenu.hideMenu();
              colorMenu = null;
            }
          });
        } );
      return $menuItem;
    };

    var tt_contextmenuHandler = function(event : JQueryEventObject) {
      var contextPos = { x : event.pageX, y : event.pageY };
      var $status = $(event.target).closest('.wschat-tt-status');
      var $body = $(event.target).closest('.wschat-tt-body');
      if ($status.length != 0) {
        event.preventDefault();
        var statusModel : StatusModel = $status.data('model');
        if (statusModel.status.uid != chat.user.uid) {
          return;
        }
        var copyTo = function(offset : number) {
          $tt.trigger('updateUserData', {
            action : 'create',
            userData : {
              dataType : 'status',
              timeFrom : timeToStr(strToTime(
                statusModel.status.timeFrom) + offset),
              timeTo : timeToStr(strToTime(
                statusModel.status.timeTo) + offset),
              comment : statusModel.status.comment
            }
          });
        };

        var menu = createMenu($tt, function($menu) {
          $menu.append(createColorMenuItem().
            on('colorSelect', function(event, data) {
              $tt.trigger('updateUserData', {
                action : 'update',
                dataId : statusModel.status.dataId,
                userData : { color :  data.color } });
              menu.hideMenu();
            } ) ).
            append(createMenuItem(chat.messages.COPY_TO_NEXT_DAY).
              on('mousedown', function(event) {
                event.stopImmediatePropagation();
              } ).
              on('click', function(event) {
                copyTo(HOUR_IN_MILLIS * 24);
                menu.hideMenu();
              } ) ).
            append(createMenuItem(chat.messages.COPY_TO_NEXT_WEEK).
              on('mousedown', function(event) {
                event.stopImmediatePropagation();
              } ).
              on('click', function(event) {
                copyTo(HOUR_IN_MILLIS * 24 * 7);
                menu.hideMenu();
              } ) ).
            append(createMenuItem(chat.messages.DELETE).
              on('mousedown', function(event) {
                event.stopImmediatePropagation();
              } ).
              on('click', function(event) {
                $tt.trigger('updateUserData', {
                  action : 'delete',
                  dataId : statusModel.status.dataId
                });
                menu.hideMenu();
              } ) );
        });
        var off = $tt.offset();
        menu.showMenu($tt).
            css('left', (event.pageX - off.left) + 'px').
            css('top', (event.pageY - off.top) + 'px');
      } else if ($body.length != 0) {
        event.preventDefault();
        if (contextPos.y - $body.offset().top > style.cellHeight) {
          return;
        }
        var menu = createMenu($tt, function($menu) {
          $menu.append(createMenuItem(chat.messages.NEW).
            on('mousedown', function(event) {
              event.stopImmediatePropagation();
            } ).
            on('click', function(event) {
              var off = $body.offset();
              var time = trimTime( (contextPos.x - off.left) *
                HOUR_IN_MILLIS / style.hourInPixel - model.timeOffset,
                HOUR_IN_MILLIS);
              $tt.trigger('updateUserData', {
                action : 'create',
                userData : {
                  dataType : 'status',
                  timeFrom : timeToStr(time),
                  timeTo : timeToStr(time + HOUR_IN_MILLIS * 4),
                  comment : ''
                }
              });
              menu.hideMenu();
            } ) );
        });
        var off = $tt.offset();
        menu.showMenu($tt).
            css('left', (event.pageX - off.left) + 'px').
            css('top', (event.pageY - off.top) + 'px');
      } else if ($(event.target).closest('.wschat-menu').length != 0) {
        event.preventDefault();
      }
    };

    interface MouseOp {
      lastPageX : number
      lastPageY : number
      mousedown : (event : JQueryEventObject) => void
      mousemove : (event : JQueryEventObject) => void
      mouseup : (event : JQueryEventObject) => void
    }

    var createDefaultMouseOp = function() {
      var mouseOp = {
        lastPageX : 0,
        lastPageY : 0,
        mousedown : function(event : JQueryEventObject) {},
        mousemove : function(event : JQueryEventObject) {},
        mouseup : function(event : JQueryEventObject) {}
      };
      return mouseOp;
    };

    var createMarker = function() {
      return $('<div></div>').
        css('position', 'absolute').
        css('pointer-events', 'none').
        css('padding', '2px 4px 2px 4px').
        css('border', '1px solid #999999').
        css('background-color', '#f0f0f0');
    };
    
    var pickMouseOp = function() {

      var mouseOp = createDefaultMouseOp();

      var pickerModel : PickerModel;
      var statusModel : StatusModel;
      var time : number;
      var $block : JQuery = null;
      var $marker : JQuery = null;

      mouseOp.mousedown = function(event) {

        $block = $('<div></div>').css('position', 'absolute').css({
          left : '0px', top : '0px', right : '0px', bottom : '0px'}).
          css('opacity', '0').css('cursor', 'ew-resize').
          css('background-color', '#ff0000');
        $tt.append($block);

        var $picker = $(event.target).closest('.wschat-tt-status-picker');
        statusModel = $picker.closest('.wschat-tt-status').data('model');
        pickerModel = $picker.data('model');
        time = strToTime( (<any>statusModel.status)[pickerModel.target])
        toFront(statusModel);
      };

      mouseOp.mousemove = function(event) {

        time += (event.pageX - mouseOp.lastPageX) /
          style.hourInPixel * HOUR_IN_MILLIS;
        statusModel.status._cache = null;

        if ($marker == null) {
          $marker = createMarker();
          $tt.append($marker);
        }

        if (pickerModel.target == 'timeFrom') {
          statusModel.status.timeFrom = timeToStr(Math.min(
            strToTime(statusModel.status.timeTo) - model.minTimeStep,
            trimTime(time) ) );
          update();
        } else if (pickerModel.target == 'timeTo') {
          statusModel.status.timeTo = timeToStr(Math.max(
            strToTime(statusModel.status.timeFrom) + model.minTimeStep,
            trimTime(time) ) );
          update();
        } else {
          return;
        }

        var text = (<any>statusModel).status[pickerModel.target];
        var off = $tt.offset();
        $marker.text(formatTime(strToTime(text) ) );
        $marker.css('left', (event.pageX - off.left) + 'px').
          css('top', (event.pageY - off.top - $marker.outerHeight() - 4) + 'px');
      };

      mouseOp.mouseup = function(event) {

        $block.remove();
        $block = null;

        if ($marker != null) {
          $marker.remove();
          $marker = null;
        }

        if (pickerModel.target == 'timeFrom' ||
            pickerModel.target == 'timeTo') {
          var userData : any = {};
          userData[pickerModel.target] = (<any>statusModel.status)[pickerModel.target];
          $tt.trigger('updateUserData', {
            action : 'update',
            dataId : statusModel.status.dataId,
            userData : userData });
        }
      };

      return mouseOp;
    }();

    var scrollMouseOp = function() {

      var mouseOp = createDefaultMouseOp();

      var lastMousedown = 0;

      var statusModel : StatusModel;
      var timeFrom : number;
      var timeTo : number;
      var $marker : JQuery = null;
      var move = false;

      mouseOp.mousedown = function(event) {

        var time = new Date().getTime();
        var dblclick = time - lastMousedown < 300;

        move = false;

        if ($(event.target).closest('.wschat-tt-status').length == 1) {
          var $status = $(event.target).closest('.wschat-tt-status');
          statusModel = $status.data('model');
          if (statusModel.status.uid == chat.user.uid) {
            if (dblclick) {
              toFront(statusModel);
              editor.beginEdit($status);
            } else {
              move = true;
              timeFrom = strToTime(statusModel.status.timeFrom);
              timeTo = strToTime(statusModel.status.timeTo);
              toFront(statusModel);
            }
          }
        }

        lastMousedown = time;
      };

      var getMarkerText = function(timeFrom : string, timeTo : string) {
        return formatTime(strToTime(timeFrom) ) + ' ~ ' +
          formatTime(strToTime(timeTo), getTimeFormat(timeFrom, timeTo) );
      };

      mouseOp.mousemove = function(event : JQueryEventObject) {
        if (move) {
          // move
          if ($marker == null) {
            $marker = createMarker();
            $tt.append($marker);
          }

          var dt = (event.pageX - mouseOp.lastPageX) /
            style.hourInPixel * HOUR_IN_MILLIS;
          timeFrom += dt;
          timeTo += dt;
          statusModel.status._cache = null;
  
          statusModel.status.timeFrom = timeToStr(trimTime(timeFrom) );
          statusModel.status.timeTo = timeToStr(trimTime(timeTo) );
          update();

          var off = $tt.offset();
          $marker.text(getMarkerText(statusModel.status.timeFrom,
            statusModel.status.timeTo) );
          $marker.css('left', (event.pageX - off.left) + 'px').
            css('top', (event.pageY - off.top - $marker.outerHeight() - 4) + 'px');

        } else {
          // scroll
          model.timeOffset += (event.pageX - mouseOp.lastPageX) / style.hourInPixel * HOUR_IN_MILLIS;
          model.userOffset += event.pageY - mouseOp.lastPageY;
          var min = style.bodyHeight - style.cellHeight * model.users.length;
          model.userOffset = Math.min(Math.max(min, model.userOffset), 0);
          $rowHeader.scrollTop(-model.userOffset);
          update();
        }
      }

      mouseOp.mouseup = function(event) {
        if (move) {

          if ($marker != null) {
            $marker.remove();
            $marker = null;
          }

          $tt.trigger('updateUserData', {
            action : 'update',
            dataId : statusModel.status.dataId,
            userData : {
              timeFrom : statusModel.status.timeFrom,
              timeTo : statusModel.status.timeTo
            } });
        }
      };

      return mouseOp;
    }();

    var zoomMouseOp = function() {

      var mouseOp = createDefaultMouseOp();
      var dragTime : number;
      mouseOp.mousedown = function(event) {
        var off = $colHeader.offset(); 
        dragTime = (event.pageX - off.left) *
          HOUR_IN_MILLIS / style.hourInPixel - model.timeOffset
      };
      mouseOp.mousemove = function(event) {
        var off = $colHeader.offset(); 
        var hourInPixel = (event.pageX - off.left) *
          HOUR_IN_MILLIS / (dragTime + model.timeOffset);
        style.hourInPixel = Math.max(1, hourInPixel);
        update();
      };
      return mouseOp;
    }();

    var $tt = $('<div></div>').
      css('display', 'block').
      css('position', 'relative').
      css('width', (style.rowHeaderWidth + style.bodyWidth) + 'px').
      css('height', (style.colHeaderHeight + style.bodyHeight) + 'px').
      append($colHeader.css({
        left : style.rowHeaderWidth + 'px', top : '0px' }) ).
      append($rowHeader.css({
        left : '0px', top : style.colHeaderHeight + 'px' }) ).
      append($body.css({
        left : style.rowHeaderWidth + 'px',
        top : style.colHeaderHeight + 'px' }) ).
      on('mousedown', tt_mousedownHandler).
      on('contextmenu', tt_contextmenuHandler).
      on('wheel', function(event) {
        $rowHeader.scrollTop($rowHeader.scrollTop() +
          (<any>event.originalEvent).deltaY);
//        if (event.originalEvent.deltaY < 0) {
  //      } else if (event.originalEvent.deltaY > 0) {;
      });

    var trimTime = function(time : number, timeStep = model.minTimeStep) {
      return Math.round(time / timeStep) * timeStep;
    };


    var createStatusEditor = function() {
      return $('<input type="text" />').
        addClass('wschat-editor').
        addClass('wschat-mouse-enabled').
        css('background-color', 'transparent').
        css('border-style', 'none').
        css('vertical-align', 'top').
        css('position', 'absolute').
        css('overflow', 'hidden').
        css('margin', '0px').
        css('padding', '0px');
    };

    var createPicker = function() {
      return $('<div></div>').addClass('wschat-tt-status-picker').
        css('position', 'absolute').
        css('background-color', '#ff0000').
        css('opacity', '0').css('cursor', 'ew-resize');
    };

    var createLabel = function() : LabelUI {

      var model = {
        text : '',
        title : '',
        color : '',
        rect : { x : 0, y : 0, width: 0, height : 0 },
        visible : true
      };

      var $label = $('<div></div>').
        css('position', 'absolute').
        css('left', '1px').css('right', '1px').
        css('top', '1px').css('bottom', '1px').
        css('vertical-align', 'top').
        css('white-space', 'nowrap').
        css('overflow', 'hidden');

      var $ui = createBlock().append($label);

      var label = {
        setRect : function(rect : Rect) {
          if (model.rect.x == rect.x &&
              model.rect.y == rect.y &&
              model.rect.width == rect.width &&
              model.rect.height == rect.height) {
            return;
          }
          model.rect = rect;
          $ui.css({
            left : rect.x + 'px',
            top : rect.y + 'px',
            width : rect.width + 'px',
            height : rect.height + 'px'});
        },
        setText : function(text : string) {
          if (model.text == text) {
            return;
          }
          model.text = text;
          $label.text(text);
        },
        setTitle : function(title : string) {
          if (model.title == title) {
            return;
          }
          model.title = title;
          $label.attr('title', title);
        },
        setVisible : function(visible : boolean) {
          if (model.visible == visible) {
            return;
          }
          model.visible = visible;
          label.$ui.css('display', model.visible? '' : 'none');
        },
        $ui : $ui
      };

      return label;
    };

    var createStatus = function() : StatusUI {

      var model = {
        text : '',
        title : '',
        color : '',
        rect : { x : 0, y : 0, width: 0, height : 0 },
        visible : true,
        editable : true
      };

      var pickerWidth = 4;

      var $st = createPicker().data('model', { target : 'timeFrom' });
      var $ed = createPicker().data('model', { target : 'timeTo' });
      var $rect = $('<div></div>').css('position', 'absolute').
        css('left', '0px').css('right', '0px').
        css('top', '0px').css('bottom', '0px').
        css('border', '1px solid #666666').
        css('opacity', '0.5');
      var $label = $('<div></div>').
        addClass('wschat-tt-label').
        css('position', 'absolute').
        css('left', '2px').css('right', '2px').
        css('top', '2px').css('bottom', '2px').
        css('vertical-align', 'top').
        css('white-space', 'nowrap').
        css('overflow', 'hidden');

      var $ui = createBlock().addClass('wschat-tt-status').
        append($rect).append($label).append($st).append($ed);

      var status = {
        setRect : function(rect : Rect) {
          if (model.rect.x == rect.x &&
              model.rect.y == rect.y &&
              model.rect.width == rect.width &&
              model.rect.height == rect.height) {
            return;
          }
          model.rect = rect;
          $ui.css({
            left : rect.x + 'px',
            top : rect.y + 'px',
            width : rect.width + 'px',
            height : rect.height + 'px'});
          $st.css({
            left : (- pickerWidth / 2) + 'px',
            top : '0px',
            width : pickerWidth + 'px',
            height : rect.height + 'px'});
          $ed.css({
            left : (rect.width - pickerWidth / 2) + 'px',
            top : '0px',
            width : pickerWidth + 'px',
            height : rect.height + 'px'});
        },
        setText : function(text : string) {
          if (model.text == text) {
            return;
          }
          model.text = text;
          util.applyDecoration($label.text(text) );
        },
        setColor : function(color : string) {
          if (model.color == color) {
            return;
          }
          model.color = color;
          $rect.css('background-color', color);
        },
        setTitle : function(title : string) {
          if (model.title == title) {
            return;
          }
          model.title = title;
          $label.attr('title', title);
          $st.attr('title', title);
          $ed.attr('title', title);
        },
        setVisible : function(visible : boolean) {
          if (model.visible == visible) {
            return;
          }
          model.visible = visible;
          status.$ui.css('display', model.visible? '' : 'none');
        },
        setEditable : function(editable : boolean) {
          if (model.editable == editable) {
            return;
          }
          $st.css('display', editable? '' : 'none');
          $ed.css('display', editable? '' : 'none');
          model.editable = editable;
        },
        isEditable : function() {
          return model.editable;
        },
        $ui : $ui
      };

      return status;
    };

    var $colHeaderBg = $('<canvas></canvas>').
      attr('width', '' + style.bodyWidth).
      attr('height', '' + style.colHeaderHeight).
      css('position', 'absolute').
      css('left', '0px').css('top', '0px');
    $colHeader.append($colHeaderBg);

    var $bodyBg = $('<canvas></canvas>').
      attr('width', '' + style.bodyWidth).
      attr('height', '' + style.bodyHeight).
      css('position', 'absolute').
      css('left', '0px').css('top', '0px');
    $body.append($bodyBg);

    var labelUICache : LabelUI[] = [];
    var statusUICache : StatusUI[] = [];

    var updateUsers = function() {
      $rowHeader.children().remove();
      $.each(model.users, function(u, user) {
        var x = 0;
        var y = style.cellHeight * u;
        var width = style.rowHeaderWidth - 6;
        var height = style.cellHeight - 6;
        $rowHeader.append(createBlock().css({
          padding : '3px',
          left : x + 'px', top : y + 'px',
          width : width + 'px', height : height + 'px',
          backgroundColor : u % 2 == 0? '': style.oddBgColor,
          verticalAlign : 'middle', 
          overflow : 'hidden', whiteSpace : 'nowrap',
          textOverflow : 'ellipsis' } ).
          attr('title', user.nickname || user.uid).
          text(user.nickname || user.uid) );
      });
    };

    var update = function() {

      interface TimelineData {
        hours : number;
        x : number;
        time : number;
        valid? : boolean
      }

      var colHeaderRect = { x : 0, y : 0,
          width : style.bodyWidth,
          height : style.colHeaderHeight };

      var bodyRect = { x : 0, y : 0,
          width : style.bodyWidth,
          height : style.bodyHeight };

      var newLabelUICache : LabelUI[] = [];
      var newStatusUICache : StatusUI[] = [];

      var dateLabelWidth = 50;
      var hourLabelWidth = 20;
      var stepWidth = 8;
      var stepInHours : number;
      var timeUnitInHours : number;

      if (style.hourInPixel * 12 < hourLabelWidth) {
        timeUnitInHours = 24;
      } else if (style.hourInPixel * 6 < hourLabelWidth) {
        timeUnitInHours = 12;
      } else if (style.hourInPixel * 3 < hourLabelWidth) {
        timeUnitInHours = 6;
      } else if (style.hourInPixel < hourLabelWidth) {
        timeUnitInHours = 3;
      } else {
        timeUnitInHours = 1;
      }
      if (style.hourInPixel * 12 < stepWidth) {
        stepInHours = 24;
      } else if (style.hourInPixel * 6 < stepWidth) {
        stepInHours = 12;
      } else if (style.hourInPixel * 3 < stepWidth) {
        stepInHours = 6;
      } else if (style.hourInPixel < stepWidth) {
        stepInHours = 3;
      } else {
        stepInHours = 1;
      }

      var timeline = function(update : (data : TimelineData) => void) {
        var startTime = function() {
          var off = new Date();
          off.setTime(Math.floor(-model.timeOffset) );
          return new Date(
              off.getFullYear(),
              off.getMonth(),
              off.getDate() ).getTime();
        }();
        var h = 0;
        while (true) {
          var x = (startTime + h * HOUR_IN_MILLIS + model.timeOffset) *
            style.hourInPixel / HOUR_IN_MILLIS;
          if (0 <= x && x < bodyRect.width) {
            update({ hours : h, x : x, time : startTime + h * HOUR_IN_MILLIS });
          }
          if (x >= bodyRect.width) {
            break;
          }
          h += stepInHours;
        }
      };

      var d0 : TimelineData = null;
      timeline(function(data) {
        if (!d0) {
          d0 = data;
        }
      });

      var hourline = function(updateDate : (data : TimelineData) => void) {

        var x : number;
        var hours : number;
        var time : number;
        var data : TimelineData;

        x = d0.x;
        hours = d0.hours;
        time = d0.time;

        while (true) {

          data = { x : x, hours : hours, time : time, valid : true };
          updateDate(data);
          if (!data.valid) {
            break;
          }

          x -= style.hourInPixel;
          hours = (hours + 23) % 24;
          time -= HOUR_IN_MILLIS;
        }

        x = d0.x;
        hours = d0.hours;
        time = d0.time;

        while (true) {

          x += style.hourInPixel;
          hours = (hours + 1) % 24;
          time += HOUR_IN_MILLIS;

          data = { x : x, hours : hours, time : time, valid : true };
          updateDate(data);
          if (!data.valid) {
            break;
          }
        }
      };

      var ctx : any;

      ctx = (<any>$colHeaderBg)[0].getContext('2d');
      ctx.clearRect(0, 0, style.bodyWidth, style.colHeaderHeight);

      hourline(function(data) {
        var rect = {
            x : data.x,
            y : 0,
            width : style.hourInPixel * 24,
            height : style.colHeaderHeight
          };

        if (!intersect(rect, colHeaderRect) ) {
          data.valid = false;
          return;
        }

        if (data.hours % 24 == 0) {
          var date = new Date();
          date.setTime(data.time);
          if (date.getDay() == 0 || date.getDay() == 6) {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          }
        }
      });

      timeline(function(data) {

        if (data.hours % 24 != 0 && data.hours % timeUnitInHours != 0) {
          return;
        }

        ctx.beginPath();
        ctx.moveTo(data.x, 0);
        ctx.lineTo(data.x, style.colHeaderHeight);
        ctx.closePath();
        ctx.strokeStyle = data.hours % 24 == 0? '#666666' :
          data.hours % timeUnitInHours == 0? '#cccccc' : '#eeeeee';
        ctx.stroke();
      });

      ctx.beginPath();
      ctx.moveTo(0, style.colHeaderHeight - 1);
      ctx.lineTo(style.bodyWidth, style.colHeaderHeight - 1);
      ctx.closePath();
      ctx.strokeStyle = '#666666';
      ctx.stroke();

      hourline(function(data) {

        var h = data.hours % 24;
        if (h % timeUnitInHours != 0) {
          return;
        }

        var minH = Math.min(24, Math.ceil(dateLabelWidth / style.hourInPixel) );
        if (h != 0 && h < minH) {
          return;
        }

        var rect = {
            x : data.x + 1,
            y : 1,
            width : style.hourInPixel * (h == 0? minH : timeUnitInHours) - 2,
            height : style.colHeaderHeight - 2
          };

        if (!intersect(rect, colHeaderRect) ) {
          data.valid = false;
          return;
        }

        var labelUI : LabelUI;
        if (labelUICache.length > 0) {
          labelUI = labelUICache.shift();
        } else {
          labelUI = createLabel();
          $colHeader.append(labelUI.$ui);
        }
        newLabelUICache.push(labelUI);

        if (h == 0) {
          var date = new Date();
          date.setTime(data.time);
          labelUI.setText( (date.getMonth() + 1) + '/' +
              date.getDate() + '(' + model.days[date.getDay()] + ')');
          labelUI.setTitle(date.getFullYear() + '/' +
              (date.getMonth() + 1) + '/' +
              date.getDate() + '(' + model.days[date.getDay()] + ')');
        } else {
          labelUI.setText('' + (h % 24) );
          labelUI.setTitle('' + (h % 24) );
        }
        labelUI.setVisible(true);
        labelUI.setRect(rect);
      });

      ctx = (<any>$bodyBg)[0].getContext('2d');
      ctx.clearRect(0, 0, style.bodyWidth, style.bodyHeight);
      ctx.fillStyle = style.oddBgColor;

      !function(updateUser : (u : number, user : TimeLineUser) => void) {
        for (var u = 0; u < model.users.length; u += 1) {
          var user = model.users[u];
          updateUser(u, user);
        };
      }(function(u, user) {
        if (u % 2 == 0) {
          return;
        }
        var rect = {
          x : 0,
          y : style.cellHeight * u + model.userOffset,
          width : style.bodyWidth,
          height : style.cellHeight
        };
        if (!intersect(rect, bodyRect) ) {
          return;
        }
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      });

      timeline(function(data) {
        ctx.beginPath();
        ctx.moveTo(data.x, 0);
        ctx.lineTo(data.x, style.bodyHeight);
        ctx.closePath();
        ctx.strokeStyle = data.hours % 24 == 0? '#666666' :
          data.hours % timeUnitInHours == 0? '#cccccc' : '#eeeeee';
        ctx.stroke();
      });

      statusUICache = function(statusUICache : StatusUI[]) {
        var _newStatusUICache : StatusUI[] = [];
        for (var i = 0; i < statusUICache.length; i += 1) {
          var statusUI = statusUICache[i];
          if (editor.currentDataId !=
              statusUI.$ui.data('model').status.dataId) {
            _newStatusUICache.push(statusUI);
          } else {
            newStatusUICache.push(statusUI);
          }
        }
        return _newStatusUICache;
      }(statusUICache);

      !function(updateStatus : (u : number, user : TimeLineUser, s : number, status : TimeLineStatus) => void) {
        for (var u = 0; u < model.users.length; u += 1) {
          var user = model.users[u];
          var statusList = model.statusMap[user.uid] || [];
          for (var s = 0; s < statusList.length; s += 1) {
            var status = statusList[s];
            updateStatus(u, user, s, status);
          }
        };
      }(function(u, user, s, status) {

        if (editor.currentDataId == status.dataId) {
          return;
        }

        if (!status._cache) {
          status._cache = {
            timeFormat : getTimeFormat(status.timeFrom, status.timeTo),
            timeFrom : strToTime(status.timeFrom),
            timeTo : strToTime(status.timeTo)
          };
        }

        var rect = {
          x : (status._cache.timeFrom + model.timeOffset) *
            style.hourInPixel / HOUR_IN_MILLIS,
          y : style.cellHeight * u + model.userOffset + 2,
          width : (status._cache.timeTo - status._cache.timeFrom) *
            style.hourInPixel / HOUR_IN_MILLIS,
          height : style.cellHeight - 4
        };

        if (!intersect(rect, bodyRect) ) {
          return;
        }

        var statusUI : StatusUI;
        if (statusUICache.length > 0) {
          statusUI = statusUICache.shift();
        } else {
          statusUI = createStatus();
          $body.append(statusUI.$ui);
        }
        newStatusUICache.push(statusUI);

        var title = formatTime(status._cache.timeFrom) + ' ~ ' +
          formatTime(status._cache.timeTo, status._cache.timeFormat) + ' ' +
          status.comment;
        statusUI.$ui.data('model', { user : user, status : status});
        statusUI.setVisible(true);
        statusUI.setRect(rect);
        statusUI.setText(status.comment);
        statusUI.setTitle(title);
        statusUI.setColor(status.color || 'hsl(240,100%,80%)');
        statusUI.setEditable(status.uid == chat.user.uid);
      });

      while (labelUICache.length > 0) {
        var labelUI = labelUICache.shift();
        labelUI.setVisible(false);
        newLabelUICache.push(labelUI);
      }
      while (statusUICache.length > 0) {
        var statusUI = statusUICache.shift();
        statusUI.setVisible(false);
        newStatusUICache.push(statusUI);
      }

      labelUICache = newLabelUICache;
      statusUICache = newStatusUICache;
    };

    var refreshData = function(userFilter : (uid : string) => boolean) {
      var users : TimeLineUser[] = [];
      var statusMap : { [ uid : string] : TimeLineStatus[] } = {};
      var addUser = function(uid : string,
          nickname : string, self : boolean) {
        users.push({uid : uid, nickname : nickname, self : self });
      };
      if (chat.user) {
        addUser(chat.user.uid, chat.user.nickname, true);
      }
      !function() {
        for (var uid in chat.users) {
          if (userFilter(uid) ) {
            addUser(uid, util.getUserNickname(chat.users[uid]), false);
          }
        }
      }();
      users.sort(function(u1, u2) {
        if (u1.self != u2.self) {
          return u1.self? -1 : 1;
        }
        return u1.nickname < u2.nickname? -1 : 1;
      });
      statusMap = util.createStatusMap(users);
      model.days = chat.messages.DAY_LABELS.split(/,/g);
      model.users = users;
      model.statusMap = statusMap;
      updateUsers();
      update();
    };

    return {
      refreshData : refreshData,
      $ui : $tt
    };
  };
}