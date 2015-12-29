//
// wschat-client
//
// @author Kazuhiko Arase
//

'use strict';

namespace wschat {

export var createChatClient = function(opts : ChatOptions) {

  var ws : WebSocket = null;

  var chat : Chat = {
    user: null,
    users: {},
    avatars: {},
    userStates: {},
    userIdleTimes: {},
    groups: {},
    groupPrevs: {},
    messages: <Messages>{},
    threadMessagesGid: null,
    threadMessages: [],
    threadMsg: {},
    fid: 0,
    readTimeout: 1000,
    readFocusTimeout: 3000,
    heartBeatInterval: 10000,
    offlineTimeout: 30000,
    reopenInterval: 5000,
    modifyTimeout: 600 * 1000,
    idleTimeout: 180 * 1000,
    dayInMillis: 24 * 3600 * 1000,
    date: 0,
    lastActiveTime: 0,
    dayLabels: null,
    monthLabels: null,
    selectedView: null,
    selectedUids: {},
    selectedGid: null,
    selectedUid: null,
    threadGid: null,
    selectedMid: null
  };

  var ui = {
    height: 300,
    leftWidth: 200,
    userWidth: 100,
    bodyWidth: 300,
    dateWidth: 40,
    rightBarWidth: 30,
    pad: 4,
    gap: 12,
    msgHeight: 70,
    barWidth: 48,
    avatarSize: 120,
    smallAvatarSize: 36
  };

  var console = {
    log: function(msg : string) {
      if (location.hostname == 'localhost') {
        window.console.log(msg);
      }
    }
  };

  var xhr = function(
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

  var isActive = function() {
    var active = true;
    $(window).
      on('focus', function(event) {
        active = true;
      }).
      on('blur', function(event) {
        active = false;
      });
    return function() {
      return active;
    };
  }();

  var replaceText = function(target : any, replacement : string) {
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

  var timer = function(task : () => void, interval : number, reset? : () => void) {
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

  var notify = function() {
    var title = document.title;
    var toggle = false;
    return timer(function() {
        document.title = toggle? chat.messages.NOTIFY_NEW_MESSAGE : title;
        toggle = !toggle;
      },
      1000,
      function() {
        document.title = title;
      });
  }();

  var notificationManager = function() {
    var win : any = window;
    var ntf : any = null;
    var init = function() {
      if (win.Notification && win.Notification.permission != 'granted') {
        win.Notification.requestPermission(function (permission : string) {
          if (win.Notification.permission != permission) {
            win.Notification.permission = permission;
          }
        });
      }
    };
    var notify = function(title : string, body : string) {
      if (win.Notification && win.Notification.permission == 'granted') {
        if (ntf != null) {
          return;
        }
        var open = function() {
        };
        var close = function() {
          ntf = null;
        };
        var options : any = {};
        if (opts.icon) {
          options.icon = opts.icon;
        }
        ntf = new win.Notification(chat.messages.NOTIFY_NEW_MESSAGE, options);
        ntf.onshow = function() {
          open();
        };
        ntf.onclick = function() {
          close();
        };
        ntf.onclose = function() {
          close();
        };
      }
    };
    var close = function() {
      if (ntf != null) {
        ntf.close();
      }
//      window.focus();
    };
    init();
    return {
      notify: notify,
      close: close
    };
  }();

  var notifySound = function() {
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
  }();

  var attachDnD = function(
    $ui : JQuery,
    beginDrag : (event : JQueryEventObject) => void,
    endDrag : (event : JQueryEventObject) => void,
    drop : (event : JQueryEventObject) => void
  ) {
    return $ui.on('dragenter', function(event) {
        event.preventDefault();
        event.stopPropagation();
        beginDrag.call(this, event);
      }).
      on('dragover', function(event : any) {
        event.preventDefault();
        event.stopPropagation();
        event.originalEvent.dataTransfer.dropEffect  = 'copy';
      }).
      on('dragleave', function(event) {
        event.preventDefault();
        event.stopPropagation();
        endDrag.call(this, event);
      }).
      on('drop', function(event) {
        event.preventDefault();
        event.stopPropagation();
        endDrag.call(this, event);
        drop.call(this, event);
      });
  };

  var draggable = function(
    proxyFactory : () => JQuery,
    $dragTarget : JQuery,
    $dropTarget : JQuery,
    canDrop : () => boolean,
    dropHandler : () => void,
    symbols : string[]
  ) {
    var $proxy : JQuery = null;
    var $symbol : JQuery = null;
    var dragPoint : Point = null;
    var dropAvailable = false;
    var mousedownPoint : Point = null;
    var clearSymbol = function() {
      if ($symbol != null) {
        $symbol.remove();
        $symbol = null;
      }
    };
    var mouseDownHandler = function(event : JQueryEventObject) {
      var off = $(this).offset();
      dragPoint = {
          x: event.pageX - off.left,
          y: event.pageY - off.top};
      mousedownPoint = {x: event.pageX, y: event.pageY};
      $(document).on('mousemove', mouseMoveHandler);
      $(document).on('mouseup', mouseUpHandler);
    };
    var mouseMoveHandler = function(event : JQueryEventObject) {
      if ($proxy == null) {
        var dx = Math.abs(event.pageX - mousedownPoint.x);
        var dy = Math.abs(event.pageY - mousedownPoint.y);
        if (dx < 2 && dy < 2) {
          return;
        }
      }
      // dragging
      if ($proxy == null) {
        $proxy = proxyFactory().
          addClass('wschat-user-proxy').
          css('position', 'absolute');
        $chatUI.append($proxy);
      }
      var x = event.pageX - dragPoint.x;
      var y = event.pageY - dragPoint.y;
      $proxy.css('left', x + 'px').css('top', y + 'px');

      dropAvailable = false;
      clearSymbol();
      if (overwrap($dropTarget, $proxy) ) {
        if (canDrop() ) {
          dropAvailable = true;
          $symbol = createDndSymbol(symbols[0]);
        } else {
          $symbol = createDndSymbol(symbols[1]);
        }
        $chatUI.append($symbol);
        $symbol.css('left', (x - $symbol.width() / 2) + 'px').
          css('top', (y - $symbol.height() / 2) + 'px');
      }
    };
    var mouseUpHandler = function(event : JQueryEventObject) {
      $(document).off('mousemove', mouseMoveHandler);
      $(document).off('mouseup', mouseUpHandler);
      if ($proxy != null) {
        $proxy.remove();
        $proxy = null;
        if (dropAvailable) {
          dropHandler();
        }
      }
      clearSymbol();
    };
    return $dragTarget.on('mousedown', mouseDownHandler);
  };

  var createSVGElement = function(tagName : string) {
    return $(document.createElementNS(
        'http://www.w3.org/2000/svg', tagName) );
  };

  var createSVG = function(w : number, h : number) {
    return createSVGElement('svg').attr({
      version: '1.1',
      width: w, height: h,
      viewBox: '0 0 ' + w + ' ' + h
    });
  };

  var trim = function(s : string) {
    return s.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  };

  var split = function(s : string, c : string) {
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

  var fillZero = function(v : number, len : number) {
    var s = '' + v;
    while (s.length < len) {
      s = '0' + s;
    }
    return s;
  };

  var messageFormat : any = function(msg : string) {
    for (var i = 1; i < arguments.length; i += 1) {
      var re = new RegExp('\\{' + (i - 1) + '\\}', 'g');
      msg = msg.replace(re, arguments[i]);
    }
    return msg;
  };

  var formatNumber = function(num : number) {
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

  var formatTime = function(t : number) {
    return ~~(t / 60 / 1000) + ':' +
      fillZero(~~(t / 1000) % 60, 2);
  };

  var getTime = function() {
    return new Date().getTime();
  };

  var trimToDate = function(d : number) {
    var date = new Date();
    date.setTime(d);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  var getMonthLabel = function(month : number) {
    if (chat.monthLabels == null) {
      chat.monthLabels = chat.messages.MONTH_LABELS.split(/,/g);
      if (chat.monthLabels.length != 12) {
        throw chat.messages.MONTH_LABELS;
      }
    }
    return chat.monthLabels[month];
  };

  var getDayLabel = function(day : number) {
    if (chat.dayLabels == null) {
      chat.dayLabels = chat.messages.DAY_LABELS.split(/,/g);
      if (chat.dayLabels.length != 7) {
        throw chat.messages.DAY_LABELS;
      }
    }
    return chat.dayLabels[day];
  };

  var getDateLabel = function(d : number) {
    var now = new Date();
    var date = new Date();
    date.setTime(d);
    var getShortLabel = function() {
      return messageFormat(chat.messages.SHORT_DATE_FORMAT, 
          getMonthLabel(date.getMonth() ),
          date.getDate(),
          getDayLabel(date.getDay() ) );
    };
    var getFullLabel = function() {
      return messageFormat(chat.messages.FULL_DATE_FORMAT, 
          date.getFullYear(),
          getMonthLabel(date.getMonth() ),
          date.getDate(),
          getDayLabel(date.getDay() ) );
    };
    if ( (now.getTime() - date.getTime() ) < chat.dayInMillis) {
      return chat.messages.TODAY + ' ' + getShortLabel();
    } else if ( (now.getTime() - date.getTime() ) < 2 * chat.dayInMillis) {
      return chat.messages.YESTERDAY + ' ' + getShortLabel();
    } else if (now.getFullYear() == date.getFullYear() ) {
      return getShortLabel();
    } else {
      return getFullLabel();
    }
  };

  var getTimeLabel = function(d : number) {
    var date = new Date();
    date.setTime(d);
    return date.getHours() +':' +
        fillZero(date.getMinutes(), 2);
  };

  var getTimestampLabel = function(d : number) {
    var date = new Date();
    date.setTime(d);
    return date.getFullYear() + '/' + 
        (date.getMonth() + 1) + '/' + 
        date.getDate() + ' ' +
        date.getHours() +':' +
        fillZero(date.getMinutes(), 2);
  };

  var getPrevMessages = function() : PrevMessage[] {
    return [
     {label: chat.messages.TODAY, lastDays: 0},
     {label: chat.messages.YESTERDAY, lastDays: 1},
     {label: chat.messages.SEVEN_DAYS, lastDays: 7},
     {label: chat.messages.THIRTY_DAYS, lastDays: 30},
     {label: chat.messages.THREE_MONTHS, lastDays: 90},
     {label: chat.messages.SIX_MONTHS, lastDays: 180},
     {label: chat.messages.ONE_YEAR, lastDays: 365},
     {label: chat.messages.FROM_FIRST, lastDays: -1}
   ];
  };

  var getPrevIndex = function(date : number) {
    var prevMessages = getPrevMessages();
    var today = trimToDate(getTime() ).getTime();
    var prevIndex = prevMessages.length - 1;
    for (;prevIndex - 1 >= 0; prevIndex -= 1) {
      var prevMessage = prevMessages[prevIndex - 1];
      var currDate = prevMessage.lastDays != -1?
          today - prevMessage.lastDays * chat.dayInMillis : 0;
      if (currDate > date) {
        break;
      }
    }
    return prevIndex;
  };

  var applyDecoration = function($target : JQuery) {
    if (opts.decorator) {
      opts.decorator($target);
    }
    return $target;
  };

  var overwrap = function() {
    var overwrap = function(p1 : number, p2 : number, q1 : number, q2 : number) {
      return !(q1 < p1 && q2 < p1 || p2 < q1 && p2 < q2);
    };
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

  var updateActiveTime = function() {
    if (chat.user) {
      var lastState = getUserState(chat.user);
      var idleTime = chat.user.idleTime;
      chat.lastActiveTime = getTime();
      chat.user.idleTime = 0;
      var changed = lastState != getUserState(chat.user);
      chat.user.idleTime = idleTime;
      if (changed) {
        userUpdate();
      }
    }
  };

  var getIdleTime = function(user : User) {
    var idleTimes : IdleTime[] = [];
    if (typeof user.idleTime != 'undefined') {
      idleTimes.push({
        time: getTime(),
        idleTime: user.idleTime
      });
    }
    $.each(chat.userIdleTimes[user.uid] || [], function(i, log) {
      if (getTime() - log.time < chat.heartBeatInterval) {
        idleTimes.push(log);
      }
    });
    var idleTime = chat.idleTimeout * 2;
    $.each(idleTimes, function(i, log){
      if (i == 0 || idleTime > log.idleTime) {
        idleTime = log.idleTime;
      }
    });
    chat.userIdleTimes[user.uid] = idleTimes;
    return idleTime;
  };

  var getUserState = function(user : User) {
    if (user && chat.date != 0 &&
        (chat.date - user.date) < chat.offlineTimeout) {
      if (user.idleTime > chat.idleTimeout) {
        return 'idle';
      }
      return 'online';
    } 
    return 'offline';
  };

  var createUserState = function(user : User) {
    var userState = getUserState(user);
    var color = userState == 'online'? '#00ff00' : 
        (userState == 'idle'? '#ffee00' : '#cccccc');
    return createSVG(12, 12).css('vertical-align', 'middle').
      append(createSVGElement('circle').
        attr({'cx': 6, 'cy': 6, 'r': 4}).
        css('fill', color).
        css('stroke', 'none') );
  };

  var createGroupState = function(group : Group) {
    return createSVG(12, 12).css('vertical-align', 'middle').
      append(createSVGElement('circle').
        attr({'cx': 7, 'cy': 7, 'r': 4}).
        css('fill', 'none').
        css('stroke', '#666666') ).
      append(createSVGElement('circle').
        attr({'cx': 5, 'cy': 5, 'r': 4}).
        css('fill', '#666666').
        css('stroke', 'none') );
  };

  var createMessageState = function(newMsg : boolean) {
    var color = '#ffcc00';
    var $svg = createSVG(12, 12).css('vertical-align', 'middle');
    if (newMsg) {
      var $cir = createSVGElement('circle').
        attr({'cx': 6, 'cy': 6, 'r': 3}).
        css('fill', color).
        css('stroke', 'none');
      $svg.append($cir);
    }
    return $svg;
  };

  var createMenuButton = function() {
    var color = '#cccccc';
    return createSVG(12, 12).css('vertical-align', 'middle').
      append(createSVGElement('circle').
        attr({'cx':6, 'cy': 6, 'r': 6}).
        css('fill', color).
        css('stroke', 'none') ).
      append(createSVGElement('path').
        attr({'d':'M 2 4 L 10 4 L 6 9 Z'}).
        css('fill', '#666666').
        css('stroke', 'none') );
  };

  var createDndSymbol = function(type : string) {
    var color = '#cccccc';
    if (type == 'add') {
      color = '#00ff00';
    } else if (type == 'remove') {
      color = '#00ff00';
    } else if (type == 'reject') {
      color = '#ff0000';
    }
    var $svg = createSVG(16, 16).css('position', 'absolute').
      append(createSVGElement('circle').
        attr({'cx':8, 'cy': 8, 'r': 8}).
        css('fill', color).
        css('stroke', 'none') );

    if (type == 'add') {
      $svg.append(createSVGElement('path').
          attr('d', 'M 2 8 L 14 8 M 8 2 L 8 14').
          css('fill', 'none').
          css('stroke-width', '4').
          css('stroke', '#ffffff') );
    } else if (type == 'remove') {
      $svg.append(createSVGElement('path').
          attr('d', 'M 2 8 L 14 8').
          css('fill', 'none').
          css('stroke-width', '4').
          css('stroke', '#ffffff') );
    } else if (type == 'reject') {
      $svg.append(createSVGElement('circle').
          attr({'cx':8, 'cy': 8, 'r': 5}).
          css('fill', '#ffffff').
          css('stroke', 'none') ).
        append(createSVGElement('path').
          attr('d', 'M 4 4 L 12 12').
          css('fill', 'none').
          css('stroke-width', '4').
          css('stroke', '#ff0000') );
    }
    return $svg;
  };

  var userChanged = function(user1 : User, user2 : User) {
    return user1.nickname != user2.nickname ||
      user1.message != user2.message || 
      getUserState(user1) != getUserState(user2);
  };

  var heartBeat = timer(function() {
    userUpdate();
  }, chat.heartBeatInterval);

  var actions : Actions = {};

  actions.login = function(data) {
    if (data.status == 'success') {
      chat.user = data.user;
      chat.messages = data.messages;
      updateActiveTime();
      userUI.invalidate();
      tabUI.invalidate();
      msgUI.invalidate();
      userUpdate();
      heartBeat.start();
      fetchGroups({lastDays: 30});
    }
  };

  actions.user = function(data) {

    if (chat.date < data.user.date) {
      chat.date = data.user.date;
    }
    data.user.idleTime = getIdleTime(data.user);

    if (chat.user.uid == data.user.uid) {
      var changed = userChanged(chat.user, data.user);
      chat.user = data.user;
      if (changed) {
        userUI.invalidate();
        //userUpdate();
      }
    } else {

      var changed = !chat.users[data.user.uid] ||
        userChanged(chat.users[data.user.uid], data.user);
      chat.users[data.user.uid] = data.user;

      var stateChanged = false;
      $.each(chat.users, function(uid, user) {
        var state = getUserState(user);
        if (chat.userStates[uid] != state) {
          stateChanged = true;
        }
        chat.userStates[uid] = state;
      });

      if (changed || stateChanged) {
        usersUI.invalidate();
        groupsUI.invalidate();
        threadUsersUI.invalidate();
      }
    }
  };

  actions.avatar = function(data) {
    chat.avatars[data.uid] = data.data;
    if (chat.user.uid == data.uid) {
      userUI.invalidate();
    } else {
      usersUI.invalidate();
      threadUsersUI.invalidate();
    }
  };

  actions.searchUsers = function(data) {
    $chatUI.trigger('searchUsers', data);
  };

  actions.requestAddToContacts = function(data) {
    setThreadGid(data.gid);
  };

  actions.acceptContact = function(data) {
  };

  actions.removeContact = function(data) {
    delete chat.users[data.uid];
    usersUI.invalidate();
  };

  actions.group = function(data) {
    var group = data.group;
    group.messages = chat.groups[group.gid]?
        chat.groups[group.gid].messages : {};
    chat.groups[group.gid] = group;
    groupsUI.invalidate();
    threadUsersUI.invalidate();
    threadUI.invalidate();
    fetchMessages(group.gid, {});
  };

  actions.addToGroup = function(data) {
    setThreadGid(data.group.gid);
  };

  actions.removeFromGroup = function(data) {
  };

  actions.exitFromGroup = function(data) {
  };

  actions.message = function(data) {
    putMessage(data.gid, data.message);
  };

  actions.newGroup = function(data) {
    setSelectedGid(data.gid);
  };

  actions.typing = function(data) {
    updateTyping(data);
  };

  actions.download = function(data) {
    if (data.message.file.deleted) {
      putMessage(data.gid, data.message);
    } else {
      var url = opts.fileuploadUrl +
        '?mid=' + encodeURIComponent(data.mid);
      if (opts.uid) {
        url += '&uid=' + encodeURIComponent(opts.uid);
      }
      location.href = url;
    }
  };

  var onopen = function(event : Event) {
    console.log(event.type);
    send({
      action: 'login',
      uid: opts.uid,
      lang: navigator.language
    });
  };

  var onclose = function(event : Event) {
    console.log(event.type);
    heartBeat.stop();
    if (chat.user != null) {
      chat.user.date = 0;
      $.each(chat.users, function(uid, user) {
        user.date = 0;
      });
    }
    userUI.invalidate();
    usersUI.invalidate();
    groupsUI.invalidate();
    threadUsersUI.invalidate();

    ws = null;

    reopen();
  };

  var onmessage = function(event : MessageEvent) {
    var data = JSON.parse(event.data);
    var action = (<any>actions)[data.action];
    if (action) {
      action(data);
    }
  };

  var onerror = function(event : Event) {
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
    }, chat.reopenInterval);
  };

  ws = initWS();

  var send = function(data : any) {
    if (ws == null) {
      return;
    }
    ws.send(JSON.stringify(data) );
  };

  var userUpdate = function() {
    send({
      action: 'user',
      user: {
        uid: chat.user.uid,
        nickname: chat.user.nickname || null,
        message: chat.user.message || null,
        date: null,
        idleTime: getTime() - chat.lastActiveTime
      }
    });
  };

  var searchUsers = function(keyword : string) {
    send({
      action: 'searchUsers',
      keyword: keyword
    });
  };

  var requestAddToContacts = function(uid : string, message : string) {
    send({
      action: 'requestAddToContacts',
      uid: uid,
      message: message
    });
  };

  var acceptContact = function(gid : string, uid : string) {
    send({
      action: 'acceptContact',
      gid: gid,
      uid: uid
    });
  };

  var removeContact = function(uid : string) {
    send({
      action: 'removeContact',
      uid: uid
    });
  };

  var newGroup = function(users : string[], message : NewMessage) {
    send({
      action: 'newGroup',
      users: users,
      message: message
    });
  };

  var addToGroup = function(gid : string, uid : string) {
    send({
      action: 'addToGroup',
      gid: gid,
      uid: uid
    });
  };

  var removeFromGroup = function(gid : string, uid : string) {
    send({
      action: 'removeFromGroup',
      gid: gid,
      uid: uid
    });
  };

  var exitFromGroup = function(gid : string) {
    send({
      action: 'exitFromGroup',
      gid: gid
    });
  };

  var fetchGroups = function(opts : FetchOptions) {
    send({
      action: 'fetchGroups',
      opts: opts || {}
    });
  };

  var fetchMessages = function(gid : string, opts : FetchOptions) {
    send({
      action: 'fetchMessages',
      gid: gid,
      opts: opts || {}
    });
  };

  var postMessage = function(gid : string, message : NewMessage) {
    send({
      action: 'postMessage',
      gid: gid,
      newGroup: !chat.groups[gid],
      message: message 
    });
  };

  var typing = function(gid : string, status : string) {
    send({
      action: 'typing',
      gid: gid,
      status: status 
    });
  };

  var updateAvatar = function(file : string) {
    send({
      action: 'updateAvatar',
      file: file
    });
  };

  var download = function(gid : string, mid : string) {
    send({
      action: 'download',
      gid: gid,
      mid: mid
    });
  };

  var setSelectedUser = function(uid : string, append? : boolean) {
    if (!append) {
      chat.selectedUids = {};
      if (uid != null) {
        chat.selectedUids[uid] = true;
      }
    } else {
      if (uid != null) {
        chat.selectedUids[uid] = !chat.selectedUids[uid];
      }
    }
    updateSelectedUsers();

    var user = chat.users[uid];
    var users = getSelectedUsers();
    if (users.length == 1 && user.gid) {
      setThreadGid(user.gid);
    } else {
      setThreadGid(null);
    }
  };

  var updateSelectedUsers = function() {
    $users.children().each(function() {
      if (chat.selectedUids[$(this).attr('wschat-uid')]) {
        $(this).addClass('wschat-selected');
      } else {
        $(this).removeClass('wschat-selected');
      }
    });
  };

  var getSelectedUsers = function() {
    var users : string[] = [];
    $.each(chat.selectedUids, function(uid, selected) {
      if (selected) {
        users.push(uid);
      }
    });
    return users;
  };

  var setSelectedGid = function(gid : string) {
    chat.selectedGid = gid;
    setThreadGid(gid);
    groupsUI.invalidate();
  };
  var getSelectedGid = function() {
    return chat.selectedGid;
  };

  var setThreadGid = function(gid : string) {
    if (chat.threadGid != null) {
      typing(chat.threadGid, 'end');
    }
    chat.threadMsg[chat.threadGid || '$null'] = $msg.val();
    chat.selectedUid = null;
    chat.threadGid = gid;
    threadUsersUI.invalidate();
    threadUI.invalidate();
    $msg.val(chat.threadMsg[chat.threadGid || '$null'] || '');
  };
  var getThreadGid = function() {
    return chat.threadGid;
  };

  var createTyping = function() {
    var $typingUI = $('<span></span>').data('active', true);
    var lastTime = getTime();
    var state = 0;
    var text = '';
    var updateTyping = function() {
      var time = getTime();
      if (time - lastTime > 300) {
        if (state == 0) {
          text = chat.messages.TYPING;
        } else {
          text += '.';
        }
        $typingUI.text(text);
        state = (state + 1) % 4;
        lastTime = time;
      }
      if ($typingUI.data('active') ) {
        requestAnimationFrame(updateTyping);
      }
    };
    window.setTimeout(updateTyping, 100);
    return $typingUI;
  };

  var updateTyping = function(typingData : TypingData) {
    if (getThreadGid() != typingData.gid) {
      return;
    }
    updateThreadContent(function($cellsContent : JQuery) {
      var sel = '[wschat-uid="'+ typingData.uid + '"]';
      if (typingData.status == 'typing') {
        var $typing = $cellsContent.children(sel);
        if ($typing.length == 0) {
          $typing = createThreadCell().
            addClass('wschat-thread-info').
            attr('wschat-uid', typingData.uid);
          $cellsContent.append($typing);
        }
        var $user = $typing.children('.wschat-thread-msg-user');
        $user.text(typingData.nickname);
        if (chat.user.uid == typingData.uid) {
          $user.addClass('wschat-thread-msg-user-me');
        } else {
          $user.removeClass('wschat-thread-msg-user-me');
        }
        var $body = $typing.children('.wschat-thread-msg-body');
        if ($body.children().length == 0) {
          $body.append(createTyping() );
        }
      } else if (typingData.status == 'end') {
        $cellsContent.children(sel).remove();
      }
    });
  };

  var updateUploadProgress = function(
    progressData : ProgressData,
    $xhr : any
  ) {
    if (getThreadGid() != progressData.gid) {
      return;
    }
    updateThreadContent(function($cellsContent : JQuery) {
      var sel = '[wschat-fid="'+ progressData.fid + '"]';
      if (progressData.progress) {
        var $progress = $cellsContent.children(sel);
        if ($progress.length == 0) {
          $progress = createThreadCell().
            addClass('wschat-thread-info').
            attr('wschat-fid', progressData.fid);
          $progress.children('.wschat-thread-msg-body').
            append($('<span></span>').addClass('wschat-upload-progress') ).
            append(createButton(chat.messages.CANCEL).
              on('click', function() {
                $xhr.abort();
              }) ).
            append($('<br/>').css('clear', 'both') );
          $cellsContent.append($progress);
        }
        var $body = $progress.children('.wschat-thread-msg-body').
          children('.wschat-upload-progress');
        $body.text(progressData.progress);
      } else {
        $cellsContent.children(sel).remove();
      }
    });
  };

  var putMessage = function(gid : string, message : Message) {
    var group = chat.groups[gid];
    group.messages[message.mid] = message;
    if (message.newMsg && 
        message.uid != chat.user.uid) {
      if (!isActive() ) {
        notify.start();
        notificationManager.notify(
            message.nickname + ' ' +
            getTimestampLabel(message.date),
            message.message);
        notifySound();
      }
    }
    groupsUI.invalidate();
    updateThreadMessage(gid, message);
  };

  var uiList : UI[] = [];

  var baseUI = function() {
    var baseUI = {
      valid: false,
      invalidate: function() {
        baseUI.valid = false;
      },
      validate: function() {}
    };
    uiList.push(baseUI);
    return baseUI;
  };

  var userUI = baseUI();
  var tabUI = baseUI();
  var usersUI = baseUI();
  var groupsUI = baseUI();
  var threadUsersUI = baseUI();
  var threadUI = baseUI();
  var msgUI = baseUI();

  // build ui
  var $user = $('<div></div>').addClass('wschat-user').
    css('padding', ui.pad + 'px');
  var $usersFrame = $('<div></div>').addClass('wschat-users-frame').
    css('overflow-x','hidden').css('overflow-y','auto');
  var $groupsFrame = $('<div></div>').addClass('wschat-groups-frame').
    css('overflow-x','hidden').css('overflow-y','auto');
  var $threadFrame = $('<div></div>').addClass('wschat-thread-frame');
  var $users = $('<div></div>').addClass('wschat-users');
  var $groups = $('<div></div>').addClass('wschat-groups');
  var $thread = $('<div></div>').addClass('wschat-thread');
  $usersFrame.append($users);
  $groupsFrame.append($groups);
  $threadFrame.append($thread);

  $threadFrame.on('click', function(event) {
    var helper = function(event : JQueryEventObject) {
      var off = $msg.offset();
      var mx = off.left + $msg.outerWidth();
      var my = off.top;
      var dx = event.pageX - mx;
      var dy = event.pageY - my;
      var r = 6;
      return {
        mx: mx,
        my: my,
        enable: -r <= dx && dx <= r && -r <= dy && dy <= r
      };
    };
    var h = helper(event);
    if (h.enable) {
        if (opts.inputAssist) {
          var $ia = $('<div></div>').
            addClass('wschat-input-assist').
            css('position', 'absolute').
            append(opts.inputAssist().on('textinput', function(event, data) {
              replaceText($msg[0], data.text);
              $msg.focus();
            }) );
          $chatUI.append($ia);
          $ia.css('left', h.mx - $ia.outerWidth() ).
            css('top', h.my - $ia.outerHeight() );
          var clickHandler = function(event : JQueryEventObject) {
            if (!helper(event).enable) {
              $ia.remove();
              $(document).off('click', clickHandler);
            }
          };
          $(document).on('click', clickHandler);
        }
    }
  });

  
  var $threadUsers = $('<div></div>').
    addClass('wschat-thread-users').
    css('text-align', 'center').
    css('overflow-x', 'hidden').
    css('overflow-y', 'auto').
    css('cursor', 'default').
    css('height', '160px'); 
  $thread.append($threadUsers);

  var commitMsg = function(
    gid : string,
    message : NewMessage,
    done? : (gid : string) => void
  ) {
    var commited = false;
    if (gid != null) {
      postMessage(gid, message);
      commited = true;
    } else {
      var users = getSelectedUsers();
      if (users.length > 0) {
        newGroup(users, message);
        commited = true;
      }
    }
    if (commited && done) {
      done(gid);
    }
  };

  var $msg = $('<textarea></textarea>').
    addClass('wschat-thread-msg').
    addClass('wschat-mouse-enabled').
    addClass('wschat-editor').
    css('width', ui.bodyWidth + 'px').
    css('height', ui.msgHeight + 'px').
    css('margin-top', '4px').
    css('margin-left', (ui.pad + ui.userWidth + ui.gap) + 'px').
    on('keydown', function(event) {
      if (event.keyCode == 13 && !event.shiftKey) {
        event.preventDefault();
        var msg = trim($(this).val());
        if (msg.length != 0 && msg.length <= 1000) {
          if (msgEditor.isEditing() ) {
            msgEditor.endEdit('commit', msg);
          } else {
            var $msg = $(this);
            commitMsg(getThreadGid(), {message: msg}, function(gid) {
              if (gid) {
                typing(gid, 'end');
              }
              $msg.val('');
            });
          }
        }
      } else if (event.keyCode == 27) {
        msgEditor.endEdit();
      }
    }).
    on('keyup', function(event) {
      var gid = getThreadGid();
      if (gid != null) {
        if ($(this).val().length > 0) {
          typing(gid, 'typing');
        } else {
          typing(gid, 'end');
        }
      }
    }).
    on('focus', function(event) {
      $(this).attr('hasFocus', 'hasFocus');
    }).
    on('blur', function(event) {
      $(this).attr('hasFocus', '');
    });

  $(document).on('paste', function(event : any) {
    if (event.originalEvent.clipboardData) {
      var items = event.originalEvent.clipboardData.items;
      if (items.length > 0) {
        var item = items[0];
        if (item.kind == 'file') {
          if (item.type == 'image/png') {
            event.preventDefault();
            uploadImage(item.getAsFile() );
          }
        }
      }
    }
  });

  var uploadImage = function(file : File) {

    var date = new Date();
    var base = date.getFullYear() +
      fillZero(date.getMonth() + 1, 2) +
      fillZero(date.getDate(), 2) +
      fillZero(date.getHours(), 2) +
      fillZero(date.getMinutes(), 2) +
      fillZero(date.getSeconds(), 2);
    
    var fr = new FileReader();
    fr.onload = function(event : any) {
      var $img = $('<img/>').
        attr('src', event.target.result).
        css('display', 'none');
      $chatUI.append($img);
      var w = $img.width();
      var h = $img.height();
      var size = 300;
      if (w > size || h > size) {
        if (w > h) {
          $img.css('width', size);
          $img.css('height', size / w * h);
        } else {
          $img.css('width', size / h * w);
          $img.css('height', size);
        }
      }
      $img.css('display', 'inline-block').remove();

      var dlg = createDialog();
      dlg.showDialog($('<div></div>').
        append($('<div></div>').
            text(chat.messages.CONFIRM_ATTACH_IMAGE) ).
        append($('<div></div>').css('padding', '4px').append($img) ).
        append(createButton(chat.messages.CANCEL).
          on('click', function(event) {
            dlg.hideDialog();
          }) ).
        append(createButton(chat.messages.OK).
          css('margin-right', '2px').
          on('click', function(event) {
            dlg.hideDialog();
            uploadFile(file, base + '.png');
          }) ) );
    };
    fr.readAsDataURL(file);
  };

  var uploadFile = function(file : File, name? : string) {

    var fd = new FormData();
    if (name) {
      fd.append("file", file, name);
    } else {
      fd.append("file", file);
    }

    var start = getTime();
    var gid = getThreadGid();
    var fid = chat.fid;
    chat.fid += 1;
    var update = function(progress : string) {
      updateUploadProgress({
          gid: gid,
          fid: fid,
          progress: progress
        }, $xhr);
    };
    var getProgress = function(event : ProgressEvent) {
      return chat.messages.UPLOADING + ' ' +
        (name || file.name) + ' ' +
        formatTime(getTime() - start) + ' ' +
        ~~(100 * event.loaded / event.total) + '%';
    };

    var $xhr = $.ajax({
        xhr: xhr(function(event : ProgressEvent) {
          if (event.lengthComputable) {
            update(getProgress(event) );
          }
        }),
        url: opts.fileuploadUrl,
        data: fd,
        cache: false,
        contentType: false,
        processData: false,
        type: 'POST'
      }).done(function(data) {
        update(null);
        var file = data.fileList[0];
        commitMsg(gid, {message: '', file: file});
      }).fail(function() {
        update(null);
      });
  };
  
  attachDnD($msg,
    function(event){
      var $msg = $(this);
      $msg.addClass('wschat-file-dragenter');
      $msg.data('lastPlh', $msg.attr('placeholder') );
      $msg.data('lastVal', $msg.val() );
      $msg.attr('placeholder', chat.messages.DROP_HERE_A_FILE);
      $msg.val('');
    },
    function(event){
      var $msg = $(this);
      $msg.removeClass('wschat-file-dragenter');
      $msg.attr('placeholder', $msg.data('lastPlh') );
      $msg.val($msg.data('lastVal') );
    },
    function(event : any){
      var files : File[] = event.originalEvent.dataTransfer.files;
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    });

  $threadFrame.append($msg);

  var msgEditor : MessageEditor = function() {
    var editing = false;
    var beginEdit = function(msg : string) {
      if (!editing) {
        $msg.addClass('wschat-msg-edit');
        $msg.val(msg);
        $msg.focus();
        editing = true;
      }
    };
    var endEdit = function(reason : string, msg : string) {
      if (editing) {
        $msg.removeClass('wschat-msg-edit');
        $msg.val('');
        editing = false;
        $msg.trigger('endEdit', {
          reason: reason || 'cancel', msg: msg});
      }
    };
    var isEditing = function() {
      return editing;
    };
    return {
      beginEdit: beginEdit,
      endEdit: endEdit,
      isEditing: isEditing
    };
  }();

  msgUI.validate = function() {
    $msg.attr('placeholder', chat.messages.ENTER_HERE_A_MESSAGE);
  };

  var createTab = function($menu? : JQuery) {

    var $tab = $('<span></span>').
      addClass('wschat-tab').
      css('display', 'inline-block').
      css('cursor', 'default').
      css('width',  (ui.leftWidth / 2 - ui.pad * 2 - 1) + 'px').
      css('padding', ui.pad + 'px');
    var $label = $('<span></span>');
    var setNewMsg = function(newMsg : boolean) {
      $tab.children().remove();
      $tab.append(createMessageState(newMsg));
      $tab.append($label);
      if ($menu) {
        $tab.append($menu.css('float', 'right') );
      }
    };
    var setLabel = function(label : string) {
      $label.text(label);
    };
    setNewMsg(false);
    $tab.data('controller', {
      setNewMsg: setNewMsg,
      setLabel: setLabel
    });
    return $tab;
  };

  var $usersTab = createTab(createMenuButton().on('click', function() {
      contactMenu.showMenu($(this) );
    }) ).
    on('mousedown', function(event) {
      event.preventDefault();
    }).
    on('click', function(event) {
      setSelectedView('users');
    });
  var $groupsTab = createTab().
    on('mousedown', function(event) {
      event.preventDefault();
    }).
    on('click', function(event) {
      setSelectedView('groups');
    });
  var $tabPane = $('<div></div>').
    css('display', 'inline-block').
    append($usersTab).
    append($groupsTab);

  tabUI.validate = function() {
    $usersTab.data('controller').setLabel(chat.messages.USERS);
    $groupsTab.data('controller').setLabel(chat.messages.GROUPS);
  };

  var $tabContent = $('<div></div>').
    css('padding', ui.pad + 'px').
    append($tabPane).
    append($usersFrame).
    append($groupsFrame);

  var $leftPane = $('<div></div>').
    css('float', 'left').
    append($user).
    append($tabContent);

  var setSelectedView = function(selectedView : string) {
    chat.selectedView = selectedView;
    $usersFrame.css('display',
        chat.selectedView == 'users'? 'block' : 'none');
    $groupsFrame.css('display',
        chat.selectedView == 'groups'? 'block' : 'none');
    if (chat.selectedView == 'users') {
      $usersTab.addClass('wschat-tab-selected');
    } else {
      $usersTab.removeClass('wschat-tab-selected');
    }
    if (chat.selectedView == 'groups') {
      $groupsTab.addClass('wschat-tab-selected');
    } else {
      $groupsTab.removeClass('wschat-tab-selected');
    }
  };
  setSelectedView('users');

  var $rightPane = $('<div></div>').
    css('float', 'left').
    css('width', (ui.userWidth + ui.bodyWidth + ui.dateWidth +
        ui.rightBarWidth + ui.gap * 2 + ui.pad * 2) + 'px').
    append($threadFrame);

  var $chatUI = $('<div></div>').
    addClass('wschat').
    append($leftPane).
    append($rightPane).
    on('mousedown', function(event) {
      if ($(event.target).closest('.wschat-mouse-enabled').length == 0) {
        event.preventDefault();
        chat.selectedUid = null;
        threadUsersUI.invalidate();
      }
    }).
    on('mousemove', function(event) {
      updateActiveTime();
    }).
    on('keydown', function(event) {
      updateActiveTime();
    });

  var createDialog = function() {
    var $dlg = $('<div></div>').
      addClass('wschat-dialog').
      addClass('wschat-mouse-enabled').
      css('position', 'absolute').
      css('display', 'none');
    var mouseDownHandler = function(event : JQueryEventObject) {
      if ($(event.target).closest('.wschat-dialog').length == 0) {
        hideDialog();
      }
    };
    var showDialog = function($content : JQuery) {
      $dlg.children().remove();
      $dlg.append($content);
      $chatUI.append($dlg).
        on('mousedown', mouseDownHandler);
      var off = $chatUI.offset();
      var x = off.left + ($chatUI.width() - $dlg.width() ) / 2;
      var y = off.top + ($chatUI.height() - $dlg.height() ) / 2;
      $dlg.css('display', 'block').
        css('left', x + 'px').
        css('top', y + 'px');
      return $content;
    };
    var hideDialog = function() {
      $dlg.remove();
      $chatUI.off('mousedown', mouseDownHandler);
    };
    return {
      showDialog: showDialog,
      hideDialog: hideDialog
    };
  };

  var createControl = function() {
    return $('<span></span>').
      css('display', 'inline-block').
      css('cursor', 'default').
      on('mousedown', function(event) {
        event.preventDefault();
      });
  };
  var createButton = function(label : string) {
    return createControl().
      addClass('wschat-button').
      css('float', 'right').
      text(label);
  };
  var createDialogContent = function(dlg : Dialog, label : string, buttons : string[]) {
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

  var createMenuItem = function(label : string) {
    return $('<div></div>').
      addClass('wschat-menu-item').
      css('cursor', 'default').
      text(label).
      on('mousedown', function(event) {
        event.preventDefault();
      });
  };
  var createMenu = function(factory : ($menu : JQuery) => void) {
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
      $chatUI.append($menu).on('mousedown', function(event) {
        if ($(event.target).closest('.wschat-menu').length == 0) {
          hideMenu();
        }
      });
      var off = $target.offset();
      var x = off.left;
      var y = off.top + $target.height();
      $menu.css('left', x + 'px').
        css('top', y + 'px');
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

  var sendRequest = function(user : ContactRequest) {
    var $editor = $('<input type="text"/>').
      addClass('wschat-editor').
      css('width', '250px').
      css('margin-bottom', '2px').
      val(messageFormat(chat.messages.CONTACT_ADD_REQUEST,
            user.nickname || user.uid));
    var $content = $('<div></div>').
      append($editor).
      append($('<br/>') ).
      append(createButton(chat.messages.CANCEL).
        on('click', function(event) {
          submitDlg.hideDialog();
        })).
      append(createButton(chat.messages.SUBMIT).
        css('margin-right', '2px').
        on('click', function(event) {
          var message = trim($editor.val());
          if (message.length > 0) {
            requestAddToContacts(user.uid, message);
            submitDlg.hideDialog();
          }
        }));
    var submitDlg = createDialog();
    submitDlg.showDialog($content);
    $editor.focus();
  };

  var searchContactHandler = function(event : JQueryEventObject) {
    var selectedUid : string = null;
    var users : { [uid : string] : User } = {};
    var updateSelectedUser = function() {
      $result.children().removeClass('wschat-selected');
      if (selectedUid != null) {
        $result.children('[wschat-uid="' + selectedUid + '"]').
          addClass('wschat-selected');
      }
    };
    var search = function(keyword : string) {
      selectedUid = null;
      users = {};
      searchUsers(keyword);
      var searchUsersHandler = function(event : JQueryEventObject, data? : any) {
        $result.children().remove();
        $.each(data.users, function(i, user) {
          if (chat.user.uid == user.uid || chat.users[user.uid]) {
            return;
          }
          users[user.uid] = user;
          var label = user.uid;
          if (user.uid != user.nickname) {
            label += ' ' + user.nickname;
          }
          var $user = $('<div></div>').
            attr('wschat-uid', user.uid).
            css('width', '240px').
            css('padding', '4px').
            css('cursor', 'default').
            css('white-space', 'nowrap').
            css('overflow', 'hidden').
            css('text-overflow', 'ellipsis').
            on('mousedown', function(event) {
              event.preventDefault();
            }).
            on('click', function(event) {
              selectedUid = user.uid;
              updateSelectedUser();
            }).
            on('dblclick', function(event) {
              sendRequest(users[selectedUid]);
            }).
            attr('title', label).
            text(label);
          $result.append($user);
        } );
      };
      var mouseUpHandler = function(event : JQueryEventObject) {
        if ($(event.target).closest('.wschat-dialog').length == 0) {
          $chatUI.off('searchUsers', searchUsersHandler).
            off('mouseup', mouseUpHandler);
        }
      };
      $chatUI.on('searchUsers', searchUsersHandler).
        on('mouseup', mouseUpHandler);
    };
    var $editor = $('<input type="text"/>').
      addClass('wschat-editor').
      attr('placeholder', chat.messages.SEARCH_CONTACT).
      css('width', '160px').
      on('keydown', function(event) {
        if (event.keyCode == 13) {
          search($(this).val());
        } else if (event.keyCode == 27) {
          dlg.hideDialog();
        }
      });
    var $result = $('<div></div>').
      css('margin-top', '4px').
      css('margin-bottom', '4px').
      css('overflow-x', 'hidden').
      css('overflow-y', 'auto').
      css('width', '240px').
      css('height', '100px');
    var $content = $('<div></div>').
      append($editor).
      append($result).
      append(createButton(chat.messages.SEND_CONTACT_ADD_REQUEST).
        on('click', function(){
          if (selectedUid == null) {
            var dlg = createDialog();
            dlg.showDialog(createDialogContent(
                dlg,
                chat.messages.SELECT_CONTACT,
                [chat.messages.OK]) );
          } else {
            sendRequest(users[selectedUid]);
          }
        }));
    var dlg = createDialog();
    dlg.showDialog($content);
    $editor.focus();
    contactMenu.hideMenu();
  };

  var deleteContactHandler = function(event : JQueryEventObject) {
    var users = getSelectedUsers();
    if (users.length == 0) {
      var dlg = createDialog();
      dlg.showDialog(createDialogContent(
          dlg,
          chat.messages.SELECT_CONTACT,
          [chat.messages.OK]) );
    } else {
      var user = chat.users[users[0]];
      var dlg = createDialog();
      dlg.showDialog(createDialogContent(
        dlg,
        messageFormat(chat.messages.CONFIRM_DELETE_CONTACT,
            user.nickname || user.uid),
        [chat.messages.CANCEL, chat.messages.OK]).
        on('close', function(event, button) {
          if (button != chat.messages.OK) {
            return;
          }
          removeContact(user.uid);
        } ) );
    }
    contactMenu.hideMenu();
  };

  var contactMenu = createMenu(function($menu : JQuery) {
    $menu.append(createMenuItem(chat.messages.SEARCH_CONTACT).
        on('click', searchContactHandler) ).
      append(createMenuItem(chat.messages.DELETE_CONTACT).
        on('click', deleteContactHandler) );
  });

  var editor = function($parent : JQuery, width : number,
    maxlength : number,
    defaultMessage : string,
    decorate : boolean
  ) {
    var lastValue = '';
    var value = '';
    var val = function(newValue? : string) : string {
      if (arguments.length > 0) {
        if (value != arguments[0]) {
          value = trim(arguments[0] || '');
          $parent.trigger('valueChange');
        }
        updateUI();
      }
      return value;
    };
    var setEdit = function(edit : boolean) {
      $editor.css('display', edit? 'inline-block' : 'none');
      $label.css('display', edit? 'none' : 'inline-block');
    };
    var commitEdit = function() {
      setEdit(false);
      val($(this).val() );
    };
    var $editor = $('<input type="text"/>').
      addClass('wschat-editor').
      addClass('wschat-mouse-enabled').
      attr('maxlength', '' + maxlength).
      css('width', width + 'px').
      css('vertical-align', 'middle').
      change(function(event) {
        commitEdit.apply(this);
      }).
      blur(function(event) {
        commitEdit.apply(this);
      }).
      keydown(function(event) {
        if (event.keyCode == 13) {
          commitEdit.apply(this);
        } else if (event.keyCode == 27) {
          $(this).val(lastValue);
          commitEdit.apply(this);
        }
      });
    $parent.append($editor);
    var $label = $('<div></div>').
      addClass('wschat-editor').
      css('display', 'inline-block').
      css('cursor', 'default').
      css('overflow', 'hidden').
      css('text-overflow', 'ellipsis').
      css('white-space', 'nowrap').
      css('border-style', 'none').
      css('width', $editor.width() + 'px').
      css('min-height', $editor.height() + 'px').
      css('vertical-align', 'middle').
      on('mousedown', function(event) {
        event.preventDefault();
        $editor.val(val());
        lastValue = $editor.val();
        setEdit(true);
        $editor.focus();
      });
    var $text = $('<span></span>');
    $label.append($text);
    $parent.append($label);

    var updateUI = function() {
      if (val() ) {
        $text.text(val()).css('color', '#000000');
      } else {
        $text.text(defaultMessage).css('color', '#cccccc');
      }
      if (decorate) {
        $text.attr('title', $text.text() );
        applyDecoration($text);
      }
      $editor.val(val());
    };

    setEdit(false);

    $parent.data('controller',{val: val});
    return $parent;
  };

  var createUserView = function() {
    return $('<div></div>').
      addClass('wschat-user-view').
      css('width', ui.avatarSize + 'px').
      css('height', ui.avatarSize + 'px').
      css('text-align', 'center').
      css('vertical-align', 'top').
      css('display', 'inline-block');
  };

  var appendImage = function($view : JQuery, $img : JQuery) {
    $view.
      append($('<span></span>').
        css('display', 'inline-block').
        css('height', '100%').
        css('vertical-align', 'middle') ).
      append($img.
        css('vertical-align', 'middle'));
    $view.css('background-color', 'inherit');
  };

  userUI.validate = function() {
    $user.children().remove();
    if (chat.user == null) {
      return;
    }
    var $view = attachDnD(createUserView(),
      function(event) {
        $(this).addClass('wschat-user-view-dragenter');
      },
      function(event) {
        $(this).removeClass('wschat-user-view-dragenter');
      },
      function(event : any) {
        var files : File[] = event.originalEvent.dataTransfer.files;
        if (files.length == 0) {
          return;
        }
        var file = files[0];
        if (!file.type.match(/^image\/.+$/) ) {
          updateAvatar('');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          return;
        }
        var fd = new FormData();
        fd.append("file", file);
        $.ajax({
          xhr: xhr(function(event : ProgressEvent) {
            // upload
            if (event.lengthComputable) {
              //var percComp = event.loaded / event.total;
              //console.log(event.type + ':' + ~~(percComp * 100) );
            }
          }),
          url: opts.fileuploadUrl,
          data: fd,
          cache: false,
          contentType: false,
          processData: false,
          type: 'POST'
        }).done(function(data) {
          updateAvatar(data.fileList[0]);
        });
        /*
        var fr = new FileReader();
        fr.onload = function(event) {
          if (event.target.result.length < 1024 * 1024) {
            updateAvatar(event.target.result);
          }
        };
        fr.readAsDataURL(file);
        */
      });

    var avatar = chat.avatars[chat.user.uid];
    if (avatar) {
      appendImage($view, $('<img/>').attr('src', avatar) );
    }
    $user.append($view);

    var $info = $('<div></div>').css('height', '36px');
    $user.append($info);

    var appendEditor = function(width : number, maxlength : number,
      value : string, defaultMessage : string, decorate? : boolean
    ) {
      var $editor = $('<div></div>').css('margin', '2px 0px 2px 0px');
      $info.append($editor);
      editor($editor, width, maxlength, defaultMessage, decorate);
      $editor.data('controller').val(value);
      return $editor;
    };
    appendEditor(ui.avatarSize - ui.gap, 20, chat.user.nickname, chat.user.uid).
        on('valueChange', function() {
      chat.user.nickname = $(this).data('controller').val() ||
        chat.user.uid;
      userUI.invalidate();
      userUpdate();
    }).prepend(createUserState(chat.user) );
    appendEditor(ui.avatarSize, 140, chat.user.message, chat.messages.TODAYS_FEELING, true). 
        on('valueChange', function() {
      chat.user.message = $(this).data('controller').val();
      userUI.invalidate();
      userUpdate();
    });
  };
  var createUserAvator = function(user : User) {
    var $view = $('<span></span>').
      addClass('wschat-user-view').
      css('display', 'inline-block').
      css('text-align', 'center').
      css('vertical-align', 'middle').
      css('float', 'left').
      css('width', ui.smallAvatarSize + 'px').
      css('height', ui.smallAvatarSize + 'px').
      css('margin-right', '2px');
    var avatar = chat.avatars[user.uid];
    if (avatar) {
      var $img = $('<img/>').attr('src', avatar).
        css('display', 'none').
        on('load', function() {
          var $img = $(this);
          var w = $img.width();
          var h = $img.height();
          if (w > ui.smallAvatarSize || h > ui.smallAvatarSize) {
            if (w > h) {
              $img.css('width', ui.smallAvatarSize + 'px');
              $img.css('height', ~~(ui.smallAvatarSize / w * h) + 'px');
            } else {
              $img.css('width', ~~(ui.smallAvatarSize / h * w) + 'px');
              $img.css('height', ui.smallAvatarSize + 'px');
            }
          }
          $img.css('display', 'inline-block').remove();
          appendImage($view, $img);
        });
        $chatUI.append($img);
    }
    return $view;
  };
  var createUser = function(user : User) {
    var txt = user.nickname || user.uid;
    var $body = $('<span></span>').
      css('display', 'inline-block').
      css('vertical-align', 'middle').
      css('float', 'left').
      css('width', (ui.leftWidth - ui.pad -
          ui.smallAvatarSize - ui.pad * 2) + 'px').
      css('overflow', 'hidden').
      css('text-overflow', 'ellipsis').
      css('white-space', 'nowrap').
      append(createUserState(user) ).
      append($('<span></span>').css('vertical-align', 'middle').
          text(txt) ).
      append($('<br/>') ).
      append(applyDecoration( $('<span></span>').
          text(user.message || '\u3000').
          attr('title', user.message) ) );
    return $('<div></div>').
      attr('wschat-uid', user.uid).
      addClass('wschat-users-cell').
      addClass('wschat-mouse-enabled').
      css('width', (ui.leftWidth - ui.pad) + 'px').
      css('padding', '2px').
      css('cursor', 'default').
      append(createUserAvator(user) ).
      append($body).append($('<br/>').css('clear', 'both') );
  };

  usersUI.validate = function() {
    var users : User[] = [];
    $.each(chat.users, function(uid, user) {
      users.push(user);
    });
    var getUserStateOrder = function(state : string) {
      return (state == 'online' || state == 'idle')? 0 : 1;
    };
    users.sort(function(u1, u2) {
      var s1 = getUserStateOrder(getUserState(u1) );
      var s2 = getUserStateOrder(getUserState(u2) );
      if (s1 != s2) {
        return s1 < s2? -1 : 1;
      }
      return u1.uid < u2.uid? -1 : 1;
    });
    $users.children().remove();
    $.each(users, function(i, user) {
      var $cell = createUser(user).
        on('mousedown', function(event) {
          event.preventDefault();
        }).
        on('click', function(event) {
          $msg.trigger('blur');
          setSelectedGid(null);
          setSelectedUser(user.uid, event.ctrlKey || event.metaKey);
        });
      $users.append($cell);

      draggable(
        function() {
          return createUser(user);
        },
        $cell,
        $threadUsers,
        function() {
          var gid = getThreadGid();
          if (gid == null) {
            return false;
          }
          var group = chat.groups[gid];
          if (group) {
            var groupUser = false;
            $.each(group.users, function(uid, user) {
              if (uid == chat.user.uid) {
                groupUser = true;
              }
            });
            if (!groupUser) {
              return false;
            }
          }
          var alreadyAdded = false;
          $.each(getThreadUsers(gid, group), function(i, uid) {
            if (uid == user.uid) {
              alreadyAdded = true;
            }
          });
          return !alreadyAdded;
        },
        function() {
          var gid = getThreadGid();
          if (gid) {
            addToGroup(gid, user.uid);
          } else {
            setSelectedUser(user.uid, true);
          }
        },
        ['add', 'reject']);
    });
    updateSelectedUsers();
  };

  var createGroup = function(group : Group) {

    var txt = '';
    var users : string[] = [];
    $.each(group.users, function(uid, user) {
      if (chat.user.uid != uid) {
        users.push(uid);
      }
    });
    users.sort(function (u1, u2) {
      return u1 < u2? -1 : 1;
    });
    $.each(users, function(i, uid) {
      if (txt) {
        txt += ', ';
      }
      var nickname = chat.users[uid]?
          chat.users[uid].nickname : group.users[uid].nickname;
      txt += (nickname || uid);
    });

    /*
    txt += ' ' + getDateLabel(group.maxDate);
     */

    var $cell = $('<div></div>').
      addClass('wschat-groups-cell').
      addClass('wschat-mouse-enabled').
      css('width', (ui.leftWidth - ui.pad) + 'px').
      css('padding', '2px').
      css('cursor', 'default').
      css('overflow', 'hidden').
      css('text-overflow', 'ellipsis').
      css('white-space', 'nowrap').
      on('mousedown', function(event) {
        event.preventDefault();
      }).
      on('click', function(event) {
        $msg.trigger('blur');
        setSelectedUser(null);
        setSelectedGid(group.gid);
      });
    if (users.length == 1) {
      $cell.append(createUserState(chat.users[users[0]]));
    } else {
      $cell.append(createGroupState(group));
    }
    $cell.append($('<span></span>').
        css('display', 'inline-block').
        css('width', (ui.leftWidth - ui.barWidth) + 'px').
        css('overflow', 'hidden').
        css('text-overflow', 'ellipsis').
        css('white-space', 'nowrap').
        css('vertical-align', 'middle').
        text(txt) );
    $cell.append(createMessageState(group.newMsg) );
    if (group.newMsg) {
      $cell.addClass('wschat-new-msg');
    }
    if (group.gid == getSelectedGid() ) {
      $cell.addClass('wschat-selected');
    }
    return $cell;
  };

  groupsUI.validate = function() {
    var newMsg = false;
    $groups.children().remove();
    var groups : Group[] = [];
    $.each(chat.groups, function(gid, group) {
      var newMsgCount = 0;
      $.each(group.messages, function(mid, message) {
        if (message.newMsg) {
          newMsgCount += 1;
        }
        if (group.maxDate < message.date) {
          group.maxDate = message.date;
        }
      });
      group.newMsg = newMsgCount > 0;
      if (group.newMsg) {
        newMsg = true;
      }
      groups.push(group);
    });
    $groupsTab.data('controller').setNewMsg(newMsg);
    if (!newMsg) {
      notify.stop();
      notificationManager.close();
    }

    groups.sort(function(g1, g2) {
      return g1.maxDate > g2.maxDate? -1 : 1;
    });

    var prevMessages = getPrevMessages();

    var createDateHeader = function(prevMessage : PrevMessage, active? : boolean) {
      var $header = $('<div></div>').
        addClass('wschat-group-date-header').
        css('cursor', 'default').
        text(prevMessage.label);
      if (active) {
        $header.addClass('ws-prev-button').
          on('click', function(event) {
            fetchGroups({lastDays: prevMessage.lastDays});
          });
      } else {
        $header.css('font-weight', 'bold');
      }
      return $header;
    };

    var prevIndex = -1;

    $.each(groups, function(_, group) {

      var currIndex = getPrevIndex(group.maxDate);
      if (prevIndex == -1 || currIndex != prevIndex) {
        $groups.append(createDateHeader(prevMessages[currIndex]) );
        prevIndex = currIndex;
      }

      $groups.append(createGroup(group) );
    });
/*
    while (prevIndex < prevMessages.length) {
      $groups.append(createDateHeader(prevMessages[prevIndex], true) );
      prevIndex += 1;
    }
*/
  };

  var createThreadCell = function() {
    return $('<div></div>').addClass('wschat-thread-cell').
      css('padding', ui.pad + 'px').
      append($('<span></span>').addClass('wschat-thread-msg-user').
          css('display', 'inline-block').
          css('width', ui.userWidth + 'px').
          css('vertical-align', 'top').
          css('text-align', 'right').
          css('overflow', 'hidden').
          css('text-overflow', 'ellipsis').
          css('white-space', 'nowrap') ).
      append($('<span></span>').addClass('wschat-thread-msg-icon').
          css('display', 'inline-block').
          css('width', ui.gap + 'px') ).
      append($('<span></span>').addClass('wschat-thread-msg-body').
          css('display', 'inline-block').
          css('word-wrap', 'break-word').
          css('white-space', 'pre').
          css('vertical-align', 'top').
          css('text-align', 'left').
          css('width', ui.bodyWidth + 'px').
          css('margin-right', ui.gap + 'px') ).
      append($('<span></span>').addClass('wschat-thread-msg-date').
          css('display', 'inline-block').
          css('text-align', 'left').
          css('width', ui.dateWidth + 'px') );
  };

  var getThreadCells = function() {
    return $thread.children('.wschat-thread-cells');
  };
  var getThreadCellsContent = function() {
    return $thread.children('.wschat-thread-cells').
      children('.wschat-thread-cells-content');
  };

  var updateThreadContent = function(update : ($cellsContent : JQuery) => void) {

    var $cells = getThreadCells();
    var $cellsContent = getThreadCellsContent();
    if ($cells.length == 0) {
      return;
    }

    var threadScrollTop = $cells.scrollTop();
    var latest = function() {
      var h1 = $cells.height();
      var h2 = $cellsContent.height();
      return !(h1 < h2 && h1 + threadScrollTop + 4 < h2);
    }();

    update($cellsContent);

    // adjust scrollTop
    $cells.children('.wschat-thread-msg-pad').remove();
    if (latest) {
      var h1 = $cells.height();
      var h2 = $cellsContent.height();
      if (h1 < h2) {
        $cells.scrollTop(h2 - h1);
      } else {
        $cells.prepend($('<div></div>').
            addClass('wschat-thread-msg-pad').
            css('height', (h1 - h2) + 'px') );
        $cells.scrollTop(0);
      }
    } else {
      $cells.scrollTop(threadScrollTop);
    }
  };

  var appendThreadMessageCell = function($cellsContent : JQuery, $cell : JQuery, date : number) {
    var $cells = $cellsContent.children('.wschat-thread-message');
    if ($cells.length == 0) {
      $cell.insertAfter($cellsContent.children('.wschat-search-header') );
    } else {
      // TODO performance tuning (nested loop..)
      for (var i = 0; i < $cells.length; i += 1) {
        var $target = $($cells[i]);
        if (date < $target.data('message').date) {
          $cell.insertBefore($target);
          break;
        } else if (i == $cells.length - 1) {
          $cell.insertAfter($target);
          break;
        }
      }
    }
  };

  var createThreadMessageCell = function($cellsContent : JQuery, gid : string, message : Message) {
    var $cell = createThreadCell().
      addClass('wschat-thread-message').
      addClass('wschat-mouse-enabled').
      attr('wschat-mid', message.mid).
      on('mousedown', function(event) {
        var message = $(this).data('message');
        chat.selectedMid = message.mid;
        updateSelectedThread();
      });
    if (message.newMsg) {
      watchMessageRead(gid, $cell);
    }
    return $cell;
  };

  var watchMessageRead = function(gid : string, $cell : JQuery) {
    $cell.data('shown', 0);
    var checkRead = function() {
      var message = $cell.data('message');
      if (!message) {
        return;
      }
      var $parent = $cell.parent().parent();
      if ($parent.length == 1 &&
            overwrap($parent, $cell) && isActive() ) {
        var lastShown = $cell.data('shown');
        if (lastShown == 0) {
          $cell.data('shown', getTime() );
        } else if (getTime() - lastShown > chat.readTimeout) {
          message.newMsg = false;
          send({
            action: 'message',
            gid: gid,
            message: message
          });
          return;
        }
      }
      window.setTimeout(checkRead, 50);
    };
    window.setTimeout(checkRead, 50);
  };

  var appendThreadMessageHeader = function($cellsContent : JQuery,
      gid : string, message : Message) {
    var date = trimToDate(message.date);
    var id = date.getFullYear() + '-' +
      date.getMonth() + '-' + date.getDate();
    var $header = $cellsContent.children('[wschat-header="'+ id + '"]');
    if ($header.length != 0) {
      return;
    }
    var hmessage = {date:date.getTime()};
    $header = createThreadCell().
      addClass('wschat-thread-message').
      attr('wschat-header', id).
      data('message', hmessage);
    $header.children('.wschat-thread-msg-body').
      addClass('wschat-thread-msg-header').
      text(getDateLabel(hmessage.date) );
    appendThreadMessageCell($cellsContent, $header, hmessage.date);
  };

  var appendEditButton = function(gid : string,
      message : Message, $cell : JQuery) {
    var lastMsg = '';
    var endEditHandler = function(event : JQueryEventObject, data? : any) {
      $msg.val(lastMsg);
      $cell.children('.wschat-thread-msg-body').
        removeClass('wschat-msg-edit');
      $msg.off('endEdit', endEditHandler);
      if (data.reason == 'commit') {
        if (message.message != data.msg) {
          message.message = data.msg;
          message.modified = true;
          send({
            action: 'message',
            gid: gid,
            notifyAll: true,
            message: message,
          });
        }
      }
    };
    var msgQuoteHandler = function() {
      var s = '';
      s += message.nickname + ' ' + getTimestampLabel(message.date) + '\n';
      if (!message.file) {
        $.each(split(message.message, '\n'), function(i, line) {
          s += '> ' + line + '\n';
        });
      } else {
        s += '> ' + message.file.name + '\n';
      }
      replaceText($msg[0], s);
      $msg.focus();
      msgMenu.hideMenu();
    };
    var msgEditHandler = function(event : JQueryEventObject) {
      $cell.children('.wschat-thread-msg-body').
        addClass('wschat-msg-edit');
      lastMsg = $msg.val();
      msgEditor.beginEdit(message.message);
      $msg.on('endEdit', endEditHandler);
      msgMenu.hideMenu();
    };
    var msgDeleteHandler = function(event : JQueryEventObject) {
      message.message = '';
      message.deleted = true;
      message.edited = false;
      send({
        action: 'message',
        gid: gid,
        notifyAll: true,
        message: message,
      });
      msgMenu.hideMenu();
    };

    var msgMenu = createMenu(function($menu) {
      $menu.append(createMenuItem(chat.messages.QUOTE).
          on('click', msgQuoteHandler) );
      if (message.uid == chat.user.uid &&
           (chat.date - message.date) < chat.modifyTimeout) {
        if (!message.file) {
          $menu.append(createMenuItem(chat.messages.EDIT).
              on('click', msgEditHandler) );
        }
        $menu.append(createMenuItem(chat.messages.DELETE).
            on('click', msgDeleteHandler) );
      }
    });

    var $menuButton = createMenuButton().
      css('float', 'right').
      css('display', 'none').
      on('click', function(event) {
        msgMenu.showMenu($(this));
      });
    $cell.children('.wschat-thread-msg-body').
      append($menuButton).
      on('mouseover', function(event) {
        if (!msgEditor.isEditing() ) {
          $menuButton.css('display', 'inline-block');
        }
      }).
      on('mouseout', function(event) {
        $menuButton.css('display', 'none');
      });
  };
  
  var updateThreadMessage = function(gid : string, message : Message) {

    if (gid != getThreadGid() ) {
      return;
    }

    if ($msg.attr('hasFocus') && message.newMsg) {
      message.newMsg = false;
      send({
        action: 'message',
        gid: gid,
        message: message
      });
    }

    var update = function($cellsContent : JQuery) {

      appendThreadMessageHeader($cellsContent, gid, message);

      var $cell = $cellsContent.children('[wschat-mid="'+ message.mid + '"]');
      if ($cell.length == 0) {
        $cell = createThreadMessageCell($cellsContent, gid, message);
        appendThreadMessageCell($cellsContent, $cell, message.date);
      }
      $cell.data('message', message);

      if (message.newMsg) {
        $cell.addClass('wschat-new-msg');
      } else {
        $cell.removeClass('wschat-new-msg');
      }

      var $user = $cell.children('.wschat-thread-msg-user');
      var sysUser = message.uid == '$sys';
      if (!sysUser) {
        $user.text(message.nickname);
      }
      if (chat.user.uid == message.uid) {
        $user.addClass('wschat-thread-msg-user-me');
      } else {
        $user.removeClass('wschat-thread-msg-user-me');
      }
      $cell.children('.wschat-thread-msg-icon').children().remove();
      $cell.children('.wschat-thread-msg-icon').
        append(createMessageState(message.newMsg) );
      $cell.children('.wschat-thread-msg-body').text(message.message);
      applyDecoration($cell.children('.wschat-thread-msg-body'));

      if (message.modified) {
        $cell.children('.wschat-thread-msg-body').append($('<span></span>').
            addClass('wschat-modified').
            css('float', 'right').
            text(chat.messages.MODIFIED) );
      }
      if (message.deleted) {
        $cell.children('.wschat-thread-msg-body').append(
            $('<span></span>').addClass('wschat-deleted').
              text(chat.messages.DELETED) );
      }

      if (!message.deleted && message.file) {
        if (!message.file.deleted) {
          $cell.children('.wschat-thread-msg-body').append(
            $('<span></span>').addClass('wschat-attached-file').
              css('cursor', 'default').
              text(message.file.name).on('click', function() {
                download(gid, message.mid);
              }) );
        } else {
          $cell.children('.wschat-thread-msg-body').append(
            $('<span></span>').addClass('wschat-deleted').
              text(message.file.name) ).append(
            $('<span></span>').addClass('wschat-deleted').
              css('margin-left', '4px').
              text(chat.messages.FILE_NOT_AVAILABLE) );
        }
      }

      var approveMsg = message.requestAddToContacts && 
        message.requestAddToContactsUid == chat.user.uid;

      if (!sysUser && !approveMsg && !message.deleted) {
        appendEditButton(gid, message, $cell);
      }

      if (approveMsg) {
        $cell.children('.wschat-thread-msg-body').append(
            createButton(chat.messages.APPROVE).on('click', function(event) {
              acceptContact(gid, message.uid);
              delete message.requestAddToContacts;
              delete message.requestAddToContactsUid;
              send({
                action: 'message',
                gid: gid,
                notifyAll: true,
                message: message
              });
            }) );
      }

      $cell.children('.wschat-thread-msg-date').
        text(getTimeLabel(message.date) ).
        attr('title', getTimestampLabel(message.date) );
    };

    updateThreadContent(update);
  };

  var updateSelectedThreadUser = function() {
    $threadUsers.children().removeClass('wschat-selected');
    if (chat.selectedUid) {
      $threadUsers.children('[wschat-uid="'+ chat.selectedUid + '"]').
        addClass('wschat-selected');
    }
  };

  var updateSelectedThread = function() {
    var $cellsContent = getThreadCellsContent();
    $cellsContent.children().removeClass('wschat-selected');
    if (chat.selectedMid) {
      $cellsContent.children('[wschat-mid="'+ chat.selectedMid + '"]').
        addClass('wschat-selected');
    }
  };

  var getThreadUsers = function(gid : string, group : Group) {

    var users : string[] = [];

    if (gid != null && !group) {
      users = getSelectedUsers();
    } else if (gid == null) {
      users = getSelectedUsers();
    } else {
      $.each(group.users, function(uid) {
        if (chat.user.uid != uid) {
          users.push(uid);
        }
      });
    }
    users.sort(function(u1, u2) {
      return u1 < u2? -1 : 1;
    });
    return users;
  };

  var createThreadUser = function(group : Group, uid : string, size : string) {
    var nickname = chat.users[uid]?
      chat.users[uid].nickname :
      group.users[uid].nickname;
    var $label = $('<div></div>').
      css('vertical-align', 'top');
    $label.append(createUserState(chat.users[uid]) );
    $label.append($('<span></span>').
      css('display', 'inline-block').
      css('overflow', 'hidden').
      css('white-space', 'nowrap').
      css('text-overflow', 'ellipsis').
      css('max-width', '108px').
      css('cursor', 'default').
      css('vertical-align', 'middle').
      text(nickname || uid) );
    var $user = $('<div></div>').
      addClass('wschat-thread-user').
      addClass('wschat-mouse-enabled').
      attr('wschat-uid', uid).
      css('padding', ui.pad + 'px').
      css('display', 'inline-block').
      css('vertical-align', 'top').
      on('dblclick', function(event) {
        if (!chat.users[uid]) {
          sendRequest({uid: uid, nickname: nickname});
        }
      });
    if (!chat.users[uid]) { 
      $user.attr('title', chat.messages.DBLCLICK_TO_SEND_CONTACT_ADD_REQUEST);
    }
    if (size == 'small') {
      $user.addClass('wschat-thread-small-user').
        css('margin', ui.pad + 'px').
        css('text-align', 'left').
        css('width', ui.avatarSize + 'px');
    } else {
      var $view = createUserView();
      var avatar = chat.avatars[uid];
      if (avatar) {
        appendImage($view, $('<img/>').attr('src', avatar) );
      }
      $user.append($view);
    }
    $user.append($label);
    return $user;
  };

  threadUsersUI.validate = function() {

    var scrollTop = $threadUsers.scrollTop();

    $threadUsers.children().remove();

    var gid = getThreadGid();
    var group = chat.groups[gid];

    var users = getThreadUsers(gid, group);
    if (users.length == 0) {
      return;
    }

    $.each(users, function(i, uid) {
      var factory = function() {
        return createThreadUser(group, uid,
            users.length < 4? 'default' :  'small');
      };
      var $user = factory().
        on('mousedown', function(event) {
          event.preventDefault();
        }).
        on('click', function(event) {
          chat.selectedUid = uid;
          updateSelectedThreadUser();
        });
      $threadUsers.append($user);
      draggable(
        factory,
        $user,
        $tabContent,
        function() {
          return getThreadUsers(gid, group).length > 1;
        },
        function() {
          if (gid != null) {
            removeFromGroup(gid, uid);
          } else {
            setSelectedUser(uid, true);
          }
        },
        ['remove', 'reject']);
    });
    updateSelectedUsers();
    $threadUsers.scrollTop(scrollTop);
  };

  threadUI.validate = function() {

    $thread.children('.wschat-thread-toolbar').remove();
    $thread.children('.wschat-thread-cells').remove();
    $msg.css('display', 'none');
    if (msgEditor.isEditing() ) {
      msgEditor.endEdit();
    }

    var gid = getThreadGid();
    var group = chat.groups[gid];

    var users = getThreadUsers(gid, group);
    if (users.length == 0) {
      return;
    }

    var active = function() {
      if (!group) {
        return true;
      }
      var found = false;
      $.each(group.users, function(uid) {
        if (uid == chat.user.uid) {
          found = true;
        }
      });
      return found;
    }();

    $thread.append(function() {
      var $btn = $('<span></span>').
        addClass('wschat-retire-button').
        css('display', 'inline-block').
        css('float', 'right').
        css('cursor', 'default').
        css('visibility', (!active || users.length < 2)? 'hidden' : 'visible').
        text(chat.messages.EXIT_FROM_THIS_GROUP).
        on('mousedown', function(event) {
          event.preventDefault();
        }).
        on('click', function(event) {
          var dlg = createDialog();
          dlg.showDialog(createDialogContent(
            dlg, chat.messages.COMFIRM_EXIT_FROM_THIS_GROUP,
            [chat.messages.CANCEL, chat.messages.OK]).
            on('close', function(event, button) {
              if (button != chat.messages.OK) {
                return;
              }
              exitFromGroup(gid);
            } ) );
        });
      if (gid == null) {
        $btn.css('visibility', 'hidden');
      }
      return $('<div></div>').
        addClass('wschat-thread-toolbar').
        append($btn).
        append($('<br/>').css('clear', 'both') );
    }());

    var $cells = $('<div></div>').
      addClass('wschat-thread-cells').
      css('overflow-x', 'hidden').
      css('overflow-y', 'auto').
      css('height', (ui.height - ui.msgHeight) + 'px');
    $thread.append($cells);

    var updateSearchHeader = function() {

      $searchHeader.children().remove();

      var prevMessages = getPrevMessages();
      var prevIndex = chat.groupPrevs[gid] || 0;
      var currIndex = (group && group.minDate != 0)?
          getPrevIndex(group.minDate) : -1;

      $.each(prevMessages, function(i, prevMessage) {
        if (i == 0 || currIndex < i) {
          return;
        }
        var $btn = $('<span></span>').
          css('cursor', 'default').
          css('margin-left', '4px').
          text(prevMessage.label);
        if (i + 1 != prevIndex) {
          $btn.addClass('ws-prev-button').
            on('click', function() {
              chat.groupPrevs[gid] = i + 1;
              group.messages = {};
              threadUI.invalidate();
              fetchMessages(gid, {lastDays: prevMessage.lastDays});
              updateSearchHeader();
            });
        } else {
          $btn.css('font-weight', 'bold');
        }
        $searchHeader.append($btn);
      } );

      if ($searchHeader.children().length > 0) {
        $searchHeader.prepend($('<span></span>').
          css('cursor', 'default').
          text(chat.messages.SHOW_MESSAGE_FROM + ':') );
      }
    };

    var $searchHeader = $('<div></div>').
      addClass('wschat-search-header').
      css('width', ui.bodyWidth + 'px').
      css('margin-left', (ui.pad + ui.userWidth + ui.gap) + 'px').
      css('padding', '4px 0px 4px 0px');
    updateSearchHeader();

    var $cellsContent = $('<div></div>').
      addClass('wschat-thread-cells-content').
      append($searchHeader);

    $cells.append($cellsContent);

    $msg.css('display', 'block').
      prop('disabled', !active);

    updateThreadContent(function(){});

    if (gid == null) {
      return;
    }

    chat.selectedMid = null;
    chat.threadMessagesGid = gid;
    chat.threadMessages = [];
    if (group) {
      $.each(group.messages, function(mid, message) {
        chat.threadMessages.push(message);
      });
    }
    chat.threadMessages.sort(function(m1, m2) {
      return m1.date > m2.date? -1 : 1;
    });
  };

  var validateThreadMessages = function() {
    var start = getTime();
    while (chat.threadMessages.length > 0 && getTime() - start < 50) {
      updateThreadMessage(
          chat.threadMessagesGid,
          chat.threadMessages.shift() );
    }
  };

  var layout = function() {
    $usersFrame.
      css('width', ui.leftWidth + 'px').
      css('height', ui.height + 'px');
    $groupsFrame.
      css('width', ui.leftWidth + 'px').
      css('height', ui.height + 'px');
    $users.children('.wschat-users-cell').
      css('width', ui.leftWidth + 'px');
    $groups.children('.wschat-groups-cell').
      css('width', ui.leftWidth + 'px');
  };

  layout();

  var validateUI = function() {

    validateThreadMessages();

    $.each(uiList, function(i, ui) {
      if (!ui.valid) {
        ui.validate();
        ui.valid = true;
      }
    });
    requestAnimationFrame(validateUI);
  };
  validateUI();

  return $chatUI;
};

}
