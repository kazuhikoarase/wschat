//
// wschat-client
//
// @author Kazuhiko Arase
//

'use strict';
namespace wschat.client {

  export var createChatClient = function(opts : ChatOptions) {

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

    var usersAvatarCache : { [uid : string] : JQuery } = {};

    var ui = {
      leftWidth: 200,

      height: 300,
      threadUserHeight: 160,
      bodyWidth: 300,
      msgHeight: 70,

      userWidth: 100,
      dateWidth: 40,
      rightBarWidth: 30,
      pad: 4,
      gap: 12,
      barWidth: 48,
      avatarSize: 120,
      smallAvatarSize: 36
    };

    var UserState = {
      ONLINE : 'online',
      IDLE : 'idle',
      BUSY : 'busy',
      OFFLINE : 'offline'
    };

    var util = function() {

      var userDataMap : { [dataId : string] : any } = {};

      var dataIdsByUserCache : { [uid : string] : string[] } = null;
      var groupContactsByGidCache : { [gid : string] : any } = null;

      var getDataIdsByUser = function(uid : string) : string[] {
        if (!dataIdsByUserCache) {
          dataIdsByUserCache = {};
          var put = function(dataId : string, uid : string) {
            if (!dataIdsByUserCache[uid]) {
              dataIdsByUserCache[uid] = [];
            }
            dataIdsByUserCache[uid].push(dataId);
          };
          for (var dataId in userDataMap) {
            var userData = userDataMap[dataId];
            put(dataId, userData.uid);
            /*
            if (userData.gid && chat.groups[userData.gid]) {
              var group = chat.groups[userData.gid];
              for (var uid in group.users) {
                put(dataId, uid);
              }
            }*/
          }
        }
        return dataIdsByUserCache[uid] || [];
      };

      var createStatusMap = function(users : { uid : string }[]) {
        var statusMap : { [uid : string] : any[] } = {};
        var put = function(uid : string, userData : any) {
          if (!statusMap[uid]) {
            statusMap[uid] = [];
          }
          var status : any = {};
          for (var k in userData) {
            status[k] = userData[k];
          }
          statusMap[uid].push(status);
        };
        var putCloneStatus = function(dataId : string) {
          var userData = userDataMap[dataId];
          if (userData.dataType != 'status') {
            return;
          } else if (typeof userData.timeFrom != 'string') {
            return;
          }
          if (userData.gid && chat.groups[userData.gid]) {
            for (var uid in chat.groups[userData.gid].users) {
              put(uid, userData);
            }
          } else {
            put(userData.uid, userData);
          }
        }
        for (var u = 0; u < users.length; u += 1) {
          var dataIds = getDataIdsByUser(users[u].uid);
          for (var d = 0; d < dataIds.length; d += 1) {
            putCloneStatus(dataIds[d]);
          }
        }
        for (var uid in statusMap) {
          statusMap[uid].sort(function(s1, s2) {
            var uid1 = s1.uid == uid? 1 : 0;
            var uid2 = s2.uid == uid? 1 : 0;
            if (uid1 != uid2) {
              return uid1 < uid2? -1 : 1;
            }
            return s1.dataId < s2.dataId? -1 : 1;
          });
        }
        return statusMap;
      };

      var getGroupContacts = function() {
        if (!groupContactsByGidCache) {
          groupContactsByGidCache = {};
          if (chat.user) {
            var dataIds = getDataIdsByUser(chat.user.uid);
            for (var d = 0; d < dataIds.length; d += 1) {
              var userData = userDataMap[dataIds[d]];
              if (userData.dataType != 'grpcont') {
                continue;
              } else if (!chat.groups[userData.gid]) {
                continue;
              }
              groupContactsByGidCache[userData.gid] = userData;
            }
          }
        }
        return groupContactsByGidCache;
      };

      return {
        createStatusMap : createStatusMap,
        getGroupContacts : getGroupContacts,
        putUserData : function(userData : any) {
          dataIdsByUserCache = null;
          groupContactsByGidCache = null;
          userDataMap[userData.dataId] = userData;
        },
        deleteUserDataByDataId : function(dataId : string) {
          dataIdsByUserCache = null;
          groupContactsByGidCache = null;
          delete userDataMap[dataId];
        },
        getUserDataByDataId(dataId : string) {
          return userDataMap[dataId];
        },
        applyDecoration : function($target : JQuery) {
          if (opts.decorator) {
            opts.decorator($target);
          }
          return $target;
        },
        getUserStateOrder : function(state : string) {
          return (state == UserState.ONLINE || state == UserState.IDLE ||
            state == UserState.BUSY)? 0 : 1;
        },
        getSortedUsers : function() {
          var users : User[] = [];
          var sort = '.sort';
          for (var uid in chat.users) {
            var user = chat.users[uid];
            (<any>user)[sort] = {
              state : util.getUserStateOrder(getUserState(user) ),
              nickname : util.getUserNickname(user)
            };
            users.push(user);
          }
          users.sort(function(u1, u2) {
            var s1 = (<any>u1)[sort];
            var s2 = (<any>u2)[sort];
            if (s1.state != s2.state) {
              return s1.state < s2.state? -1 : 1;
            }
            return s1.nickname < s2.nickname? -1 : 1;
          });
          for (var i = 0; i < users.length; i += 1) {
            delete (<any>users[i])[sort];
          }
          return users;
        },
        getUserNickname : function(user : User) {
          var nickname = user.nickname || user.uid;
          if (chat.groups[user.gid]) {
            nickname = chat.groups[user.gid].nickname || nickname;
          }
          return nickname;
        }
      };
    }();

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

    var notifyTitle = function() {
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

    var notificationManager = createNotificationManager(opts,
      () => chat.messages.NOTIFY_NEW_MESSAGE);
    var notifySound = createNotifySound(opts);

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

    var isSaveDataSupported = function() {
      var w : any = window;
      var d : any = document;
      return w.URL && w.Blob && d.execCommand;
    };
    var saveData = function() {
      var lastUrl : string = null;
      return function(contentType : string, data : string, filename : string) {
        var blob = new Blob([data], {type: contentType});
        if(window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, filename);
        } else {
          if (lastUrl != null) {
            window.URL.revokeObjectURL(lastUrl);
            lastUrl = null;
          }
          var url = window.URL.createObjectURL(blob);
          lastUrl = url;
          var anchor : any = window.document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
        }
      };
    }();

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
          return UserState.IDLE;
        }
        return UserState.ONLINE;
      }
      return UserState.OFFLINE;
    };

    var createUserState = function(user : User) {
      var userState = getUserState(user);
      if (userState != UserState.OFFLINE && user.state) {
        userState = user.state;
      }
      var color : string;
      var title : string;
      switch(userState) {
      case UserState.ONLINE :
        color = '#00ff00';
        title = chat.messages.ONLINE;
        break;
      case UserState.IDLE :
        color = '#ffee00';
        title = chat.messages.IDLE;
        break;
      case UserState.BUSY :
        color = '#ff6633';
        title = chat.messages.BUSY;
        break;
      default : 
        color = '#cccccc';
        title = chat.messages.OFFLINE;
        break;
      }
      return createSVG(12, 12).css('vertical-align', 'middle').
        append(createSVGElement('g').
          append(createSVGElement('circle').
            attr({'cx': 6, 'cy': 6, 'r': 4}).
            css('fill', color).
            css('stroke', 'none') ).
          append(createSVGElement('title').text(title) ) );
        ;
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

    var userChanged = function(user1 : User, user2 : User) {
      return user1.nickname != user2.nickname ||
        user1.message != user2.message ||
        user1.state != user2.state ||
        getUserState(user1) != getUserState(user2);
    };

    var heartBeat = timer(function() {
      userUpdate();
    }, chat.heartBeatInterval);

    var drawAvatar = function(ctx : any, width : number, height : number) {

      var w0 = width / 2;
      var h0 = height / 2 - height * 0.15;

      // head
      !function() {
        ctx.beginPath();
        ctx.arc(w0, h0, width * .3, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
      }();

      // body
      !function() {
        ctx.beginPath();
        var w1 = width * .4;
        var h1= h0 + height * .25;
        var h2= h0 + height * .25;
        var h3 = height - 4;
        ctx.moveTo(w0 - w1, h3);
        ctx.quadraticCurveTo(w0 - w1, h1, w0, h2);
        ctx.quadraticCurveTo(w0 + w1, h1, w0 + w1, h3);
        ctx.closePath();
        ctx.fill();
      }();
    };

    var getDefaultAvatar = function() {

      var width = 120;
      var height = 120;
      var cv = <any>$('<canvas></canvas>').
        attr({width : width, height : height})[0];
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#999999';
      ctx.fillRect(0, 0, width, height);

      // x
      !function() {
        ctx.strokeStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(width, height);
        ctx.moveTo(width,0);
        ctx.lineTo(0, height);
        ctx.stroke();
      };

      ctx.strokeStyle = 'none';
      ctx.fillStyle = '#ffffff';
      drawAvatar(ctx, width, height);

      var src = cv.toDataURL();
      return function() { return src; };
    }();

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
          statusUI.invalidate();
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
          statusUI.invalidate();
        }
      }
    };

    actions.avatar = function(data) {
      chat.avatars[data.uid] = data.data || getDefaultAvatar();
      delete usersAvatarCache[data.uid];
      if (chat.user.uid == data.uid) {
        userUI.invalidate();
      } else {
        usersUI.invalidate();
        threadUsersUI.invalidate();
      }
    };

    actions.userData = function(data) {
      if (data['delete']) {
        util.deleteUserDataByDataId(data.data.dataId);
      } else {
        util.putUserData(data.data);
      }
      if (data.data.dataType == 'status') {
        statusUI.invalidate();
      } else if (data.data.dataType == 'grpcont') {
        usersUI.invalidate();
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
      usersUI.invalidate();
      groupsUI.invalidate();
      threadUsersUI.invalidate();
      threadUI.invalidate();
      statusUI.invalidate();
      fetchMessages(group.gid, {});
    };

    actions.addToGroup = function(data) {
      setThreadGid(data.group.gid);
    };

    actions.removeFromGroup = function(data) {
    };

    actions.exitFromGroup = function(data) {
    };

    actions.message = function() {

      var queue : any[] = [];
      var alive = false;

      var putMessageIndirect = function() {
        try {
          var start = getTime();
          while (queue.length > 0 && getTime() - start < 50) {
            var data = queue.shift();
            putMessage(data.gid, data.message);
          }
        } finally {
          window.setTimeout(function() {
            if (queue.length == 0) {
              alive = false;
            } else {
              putMessageIndirect();
            }
          }, 50);
        }
      };

      return function(data : any) {
        queue.push(data);
        if (!alive) {
          alive = true;
          putMessageIndirect();
        }
      };
    }();

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

    var ws : WebSocket = null;

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
          state: chat.user.state || null,
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
      $users.children('.wschat-users-cell').each(function() {
        if (chat.selectedUids[$(this).data('uid')]) {
          $(this).addClass('wschat-selected');
        } else {
          $(this).removeClass('wschat-selected');
        }
      });
      $users.children('.wschat-group-users-cell').each(function() {
        if (chat.selectedGid == $(this).data('gid') ) {
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
          window.setTimeout(updateTyping, 50);
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
        var sel = '[wschat-uid="' + typingData.uid + '"]';
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
      $xhr : JQueryXHR
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
      if (!group) {
        throw 'unknown gid:' + gid;
      }
      group.messages[message.mid] = message;
      if (message.newMsg &&
          message.uid != chat.user.uid) {
        if (!isActive() ) {
          notifyTitle.start();
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
    var statusUI = baseUI();

    statusUI.validate = function() {
      TimeLineUtil.refresh();
    };

    var TimeLineUtil = function() {

      var timeLine : TimeLine = null;
      var _gid : string = null;
      var _userFilter : (uid : string) => boolean = null;

      var timeLine_updateUserDataHandler = function(
        event : JQueryEventObject,
        data : any
      ) {
        if (data.action == 'update') {
          var userData = util.getUserDataByDataId(data.dataId);
          var changed = false;
          if (userData) {
            for (var k in data.userData) {
              changed = changed || userData[k] != data.userData[k];
            }
          }
          if (userData && changed) {
            for (var k in data.userData) {
              userData[k] = data.userData[k];
            }
            send({
              action : 'updateUserData',
              date : userData.timeTo,
              userData : userData
            });
          }
        } else if (data.action == 'create') {
          send({
            action : 'updateUserData',
            date : data.timeTo,
            userData : data.userData,
            create : true
          });
        } else if (data.action == 'delete') {
          var userData = util.getUserDataByDataId(data.dataId);
          send({
            action : 'updateUserData',
            date : userData.timeTo,
            userData : userData,
            'delete' : true
          });
        }
      };

      var show = function(gid : string, userFilter : (uid : string) => boolean) {
        var btnSize = 14;
        var $closeButton = createSVG(btnSize, btnSize).
          css('float', 'right').
          css('padding', '3px').
          css('vertical-align', 'top').
          append(createSVGElement('rect').
            css('stroke', 'none').css('fill', '#999999').
            attr({ x : 0, y : 0, width : btnSize, height : btnSize }) ).
          append(createSVGElement('path').
            css('stroke', '#ffffff').
            css('stroke-width', '2').css('fill', 'none').
            attr('d', 'M2 2L12 12M2 12L12 2') ).
            on('mouseover', function(event) {
              $(this).css('opacity', '0.6');
            }).
            on('mouseout', function(event) {
              $(this).css('opacity', '');
            }).
            on('mousedown', function(event) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }).
            on('click', function(event) {
              if (timeLine != null) {
                timeLine.dlg.hideDialog();
              }
            });
        var $title = $('<div></div>').
            css('background-color', '#f0f0f0').
            css('margin', '0px 0px 4px 0px').
            css('vertical-align', 'middle').
            css('line-height', '20px').
          append($('<div></div>').
              css('vertical-align', 'middle').
              css('line-height', '20px').
              css('cursor', 'default').
              css('float', 'left').
              css('padding', '0px 0px 0px 4px').
              text(chat.messages.TIMELINE) ).
          append($closeButton).
          append($('<br/>').css('clear', 'both') ).
          on('mousedown', function(event : JQueryEventObject) {
            event.preventDefault();
            var $dlg = $(event.target).closest('.wschat-dialog');
            var off = $dlg.offset();
            var dragPoint = {
              x : off.left - event.pageX,
              y : off.top - event.pageY
            };
            var doc_mousemoveHandler = function(event : JQueryEventObject) {
              $dlg.css('left', (event.pageX + dragPoint.x) + 'px').
                css('top', (event.pageY + dragPoint.y) + 'px');
            };
            var doc_mouseupHandler = function(event : JQueryEventObject) {
              $(document).off('mousemove', doc_mousemoveHandler).
                off('mouseup', doc_mouseupHandler);
            };
            $(document).on('mousemove', doc_mousemoveHandler).
              on('mouseup', doc_mouseupHandler);
          });

        if (timeLine != null) {
          timeLine.dlg.hideDialog();
        }
        _gid = gid;
        _userFilter = userFilter;
        timeLine = createTimeLine(chat, util);
        timeLine.refreshData(gid, userFilter);
        timeLine.$ui.on('updateUserData', timeLine_updateUserDataHandler);
        timeLine.dlg = createDialog($chatUI);
        var $dlg = timeLine.dlg.showDialog($('<div></div>').
          append($title).
          append(timeLine.$ui) ).
          on('hideDialog', function() {
            timeLine = null;
          }).parent();
        var $win = $(window);
        var x = ($win.width() - $dlg.width() ) / 2;
        var y = ($win.height() - $dlg.height() ) / 2;
        $dlg.css('left', x + 'px').css('top', y + 'px');
      };

      var refresh = function() {
        if (timeLine != null) {
          timeLine.refreshData(_gid, _userFilter);
        }
      };

      return {
        show : show,
        refresh : refresh
      }
    }();

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

    !function(inputAssist : () => JQuery) {

      if (!inputAssist) {
        return;
      }

      var $assist : JQuery = null;

      var touchStart : Point = null;
      var lastAngle = 0;
      var longTapCount = -1;

      function longTap() {
        if (longTapCount == 0) {
          $threadFrame.trigger('longtap');
        } else if (longTapCount > 0) {
          longTapCount -= 1;
          window.setTimeout(longTap, 100);
        }
      }

      var eventToPoint = function(event : any) : Point {
        if (event.originalEvent.touches.length > 0) {
          var touch = event.originalEvent.touches[0];
          return { x : ~~touch.pageX, y : ~~touch.pageY };
        } else {
          return null;
        }
      };

      var touchStartHandler = function(event : any) {
        touchStart = eventToPoint(event);
        lastAngle = 0;
        var off = $msg.offset();
        if (off.left > touchStart.x && off.top < touchStart.y) {
          event.preventDefault();
          longTapCount = 5;
          longTap();
        }
        $(document).on('touchmove', touchMoveHandler).
          on('touchend', touchEndHandler);
      };

      var touchMoveHandler = function(event : any) {
        if ($assist != null) {
          var p = eventToPoint(event);
          if (p.x != touchStart.x || p.y != touchStart.y) {
            var angle = Math.atan2(p.y - touchStart.y, p.x - touchStart.x);
            if (Math.abs(lastAngle - angle) > 0.2) {
              if (lastAngle > angle) {
                $assist.children().trigger('prev');
              } else {
                $assist.children().trigger('next');
              }
              lastAngle = angle;
            }
          }
        }
      };

      var touchEndHandler = function(event : any) {
        longTapCount = -1;
        $(document).off('touchmove', touchMoveHandler).
          off('touchend', touchEndHandler);
        if ($assist != null) {
          $assist.children().trigger('commit');
          $(document).trigger('click');
        }
      };

      // smartphone
      $threadFrame.on('touchstart', touchStartHandler).
      on('longtap', function(event) {
        showAssist({left: '0px', bottom: '0px'});
      });

      $threadFrame.on('click', function(event) {

        var off = $msg.offset();
        var mx = off.left + $msg.outerWidth();
        var my = off.top;

        var dx = event.pageX - mx;
        var dy = event.pageY - my;
        var r = 6;

        if (-r <= dx && dx <= r && -r <= dy && dy <= r) {
          showAssist({right: '0px', bottom: '0px'});
        }
      });

      function showAssist(css : Object) {

        if ($assist != null) {
          return;
        }

        $assist = $('<div></div>').
          addClass('wschat-input-assist').
          css('position', 'absolute').
          css(css).
          append(inputAssist().on('textinput', function(event, data) {
            replaceText($msg[0], data.text);
            $msg.focus();
          }) );
        $assistHolder.append($assist);

        callLater(function() {
          $(document).on('click', clickHandler);
        });
      }

      var clickHandler = function(event : JQueryEventObject) {
        $assist.remove();
        $assist = null;
        $(document).off('click', clickHandler);
      };

    }(opts.inputAssist);

    var $threadUsers = $('<div></div>').
      addClass('wschat-thread-users').
      css('text-align', 'center').
      css('overflow-x', 'hidden').
      css('overflow-y', 'auto').
      css('cursor', 'default');
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
      css('margin-left', (ui.pad + ui.userWidth + ui.gap) + 'px').
      on('keydown', function(event) {
        if (event.keyCode == 13 && !event.shiftKey) {
          event.preventDefault();
          if (!chat.user || chat.user.date == 0) {
            console.log('offline');
            return;
          }
          var msg = rtrim($(this).val());
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

      var img_loadHandler = function($img : JQuery) {

        var dlg = createDialog($chatUI);
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
              uploadFile(file, getTimestamp() + '.png');
            }) ) );
      };

      var fr = new FileReader();
      fr.onload = function(event : any) {
        loadImage($chatUI, event.target.result, 300, img_loadHandler);
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

      var $xhr = <JQueryXHR>$.ajax({
          xhr: xhr(function(event : ProgressEvent) {
            if (event.lengthComputable) {
              update(getProgress(event) );
            }
          }),
          url: opts.fileuploadUrl,
          data: fd,
          contentType: false,
          processData: false,
          method: 'POST'
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

    var $assistHolder = $('<div></div>').
      css('margin-left', $msg.css('margin-left') ).
      css('position', 'relative');

    $threadFrame.append($('<div></div>').
      css('display', 'inline-block').
      css('margin-top', '4px').
      append($assistHolder).append($msg) );

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

    var createResizeButton = function(size : number) {

      var $rect : JQuery = null;
      var dragPoint : { x : number, y : number } = null;
      var currSize : { width : number, height : number } = null;
      var uiSize : { height : number, bodyWidth : number } = null;

      var getSize = function(event : JQueryEventObject) {
        var off = $chatUI.offset();
        var curr = {
          x : event.pageX - dragPoint.x,
          y : event.pageY - dragPoint.y };
        var width = curr.x - off.left + currSize.width;
        var height = curr.y - off.top + currSize.height;
        var $outer = $chatUI.parent().parent();
        width = Math.max(600, Math.min(width, $outer.outerWidth() - 2) );
        height = Math.max(400, Math.min(height, $outer.outerHeight() - 2 - 2) );
        return { width : width, height : height };
      };

      var doResize = function(event : JQueryEventObject) {
        var size = getSize(event);
        $rect.css('width', size.width + 'px').
          css('height', size.height + 'px');
        var height = uiSize.height + (size.height - currSize.height);
        var bodyWidth = uiSize.bodyWidth + (size.width - currSize.width);
        if (ui.height != height || ui.bodyWidth != bodyWidth) {
          ui.height = height;
          ui.bodyWidth = bodyWidth;
          layout();
        }
      };

      var resize_mouseDownHandler = function(event : JQueryEventObject) {
        event.preventDefault();
        currSize = {
          width : $chatUI.outerWidth() - 2,
          height : $chatUI.outerHeight() - 2 };
        var off = $chatUI.offset();
        dragPoint = {
          x : event.pageX - off.left,
          y : event.pageY - off.top };
        uiSize = {
          height : ui.height,
          bodyWidth : ui.bodyWidth };
        $rect = $('<div></div>').
          css('cursor', 'nwse-resize').
          css('position', 'absolute').
          css('left', off.left + 'px').css('top', off.top + 'px').
          css('border', '1px solid #cccccc').
          css('width', currSize.width + 'px').
          css('height', currSize.height + 'px');
        $('BODY').append($rect);

        $(document).on('mousemove', resize_mouseMoveHandler).
          on('mouseup', resize_mouseUpHandler);
      };

      var resize_mouseMoveHandler = function(event : JQueryEventObject) {
        doResize(event);
      };

      var resize_mouseUpHandler = function(event : JQueryEventObject) {
        $(document).off('mousemove', resize_mouseMoveHandler).
          off('mouseup', resize_mouseUpHandler);
        $rect.remove();
      };

      return createSVG(size, size).append(createSVGElement('path').
          attr('d', 'M ' + size + ' ' + size +
            ' L ' + size + ' 0 L 0 ' + size + ' Z').
          attr('stroke', 'none').attr('fill', '#cccccc') ).
        css('position', 'absolute').
        css('bottom', '0px').css('right', '0px').
        css('cursor', 'nwse-resize').
        on('mousedown', resize_mouseDownHandler);
    };

    var createPane = () => $('<div></div>').
      css('white-space', 'normal').
      css('display', 'inline-block').
      css('vertical-align', 'top');

    var $leftPane = createPane().append($user).append($tabContent);

    var $rightPane = createPane().append($threadFrame);

    var $chatUI = $('<div></div>').
      addClass('wschat').
      css('white-space', 'nowrap').
      append($leftPane).
      append($rightPane).
      append($('<div></div>').css('position', 'relative').append(
      createResizeButton(8) ) ).
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
      var submitDlg = createDialog($chatUI);
      submitDlg.showDialog($content);
      $editor.focus();
    };

    var searchContactHandler = function(event : JQueryEventObject) {
      var selectedUid : string = null;
      var users : { [uid : string] : User } = {};
      var updateSelectedUser = function() {
        $result.children().each(function() {
          if ($(this).data('uid') == selectedUid) {
            $(this).addClass('wschat-selected');
          } else {
            $(this).removeClass('wschat-selected');
          }
        });
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
              css('width', '240px').
              css('padding', '4px').
              css('cursor', 'default').
              css('white-space', 'nowrap').
              css('overflow', 'hidden').
              css('text-overflow', 'ellipsis').
              data('uid', user.uid).
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
              var dlg = createDialog($chatUI);
              dlg.showDialog(createDialogContent(
                  dlg,
                  chat.messages.SELECT_CONTACT,
                  [chat.messages.OK]) );
            } else {
              sendRequest(users[selectedUid]);
            }
          }));
      var dlg = createDialog($chatUI);
      dlg.showDialog($content);
      $editor.focus();
      contactMenu.hideMenu();
    };

    var deleteContactHandler = function(event : JQueryEventObject) {
      var users = getSelectedUsers();
      if (users.length == 0) {
        var dlg = createDialog($chatUI);
        dlg.showDialog(createDialogContent(
            dlg,
            chat.messages.SELECT_CONTACT,
            [chat.messages.OK]) );
      } else {
        var user = chat.users[users[0]];
        var dlg = createDialog($chatUI);
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

    var contactMenu = createMenu($chatUI, function($menu : JQuery) {
      $menu.append(createMenuItem(chat.messages.SEARCH_CONTACT).
          on('click', searchContactHandler) ).
        append(createMenuItem(chat.messages.DELETE_CONTACT).
          on('click', deleteContactHandler) );
    });


    var userContactMenu = createMenu($chatUI, function($menu : JQuery) {

      $menu.append(createMenuItem(chat.messages.DELETE_CONTACT).
          on('click', function(event) {
            var user = chat.users[$menu.data('uid')];
            var dlg = createDialog($chatUI);
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
            userContactMenu.hideMenu();
          }) ).append(createMenuItem(chat.messages.SHOW_TIMELINE).
          on('click', function(event) {
            var user = chat.users[$menu.data('uid')];
            TimeLineUtil.show(user.gid, (uid) => uid == user.uid);
            userContactMenu.hideMenu();
          }) );
    });

    var groupContactMenu = createMenu($chatUI, function($menu : JQuery) {
      $menu.append(createMenuItem(chat.messages.DELETE_CONTACT).
          on('click', function(event : JQueryEventObject) {
            var gid = $menu.data('gid');
            var groupContact = util.getGroupContacts()[gid];
            if (groupContact) {
              send({
                action : 'updateUserData',
                userData : groupContact,
                'delete' : true
              });
            }
            groupContactMenu.hideMenu();
          }) ).append(createMenuItem(chat.messages.SHOW_TIMELINE).
          on('click', function(event) {
            var gid = $menu.data('gid');
            TimeLineUtil.show(gid, (uid) => !!chat.groups[gid].users[uid]);
            groupContactMenu.hideMenu();
          }) );
    });

    var groupMenu = createMenu($chatUI, function($menu : JQuery) {
      $menu.append(createMenuItem(chat.messages.ADD_TO_CONTACTS).
          on('click', function(event) {
            var gid = $menu.data('gid');
            var groupContact = util.getGroupContacts()[gid];
            if (!groupContact) {
              send({
                action : 'updateUserData',
                userData : {
                  dataType : 'grpcont',
                 'private' : true,
                  gid : gid
                },
                create : true
              });
            }
            groupMenu.hideMenu();
          }) ).append(createMenuItem(chat.messages.SHOW_TIMELINE).
          on('click', function(event) {
            var gid = $menu.data('gid');
            TimeLineUtil.show(gid,  (uid) => !!chat.groups[gid].users[uid]);
            groupMenu.hideMenu();
          }) );
    });

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
            contentType: false,
            processData: false,
            method: 'POST'
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

      var userState_clickHandler = function(event : JQueryEventObject) {
        if (getUserState(chat.user) == UserState.OFFLINE) {
          return;
        }
        var items = [
          { label : chat.messages.ONLINE, state : UserState.ONLINE },
          { label : chat.messages.IDLE, state : UserState.IDLE },
          { label : chat.messages.BUSY, state : UserState.BUSY }
        ];
        var stateMenu = createMenu($chatUI, function($menu : JQuery) {
          $.each(items, function(i, item) {
            var $chk = createSVG(12, 12).css('vertical-align', 'middle');
            var state = chat.user.state? chat.user.state : UserState.ONLINE;
            if (state == item.state) {
              $chk.append(createSVGElement('path').
                attr('d', 'M 2 6 L 6 10 L 10 2').css('fill', 'none').
                css('stroke-width', '2').css('stroke', '#666666') );
            }
            $menu.append(createMenuItem(item.label).prepend(
              createUserState(<any>{
                state : item.state,
                date : chat.date
              }) ).prepend($chk).on('click', function(event) {
                chat.user.state = item.state == UserState.ONLINE? null : item.state;
                userUI.invalidate();
                userUpdate();
                stateMenu.hideMenu();
              }) );
          });
        });
        stateMenu.showMenu($(this) );
      };

      var appendEditor = function(width : number, maxlength : number,
        value : string, defaultMessage : string, decorate? : boolean
      ) {
        var $editor = $('<div></div>').css('margin', '2px 0px 2px 0px');
        $info.append($editor);
        createEditor($editor, width, maxlength,
          defaultMessage, decorate? util : null);
        $editor.data('controller').val(value);
        return $editor;
      };
      appendEditor(ui.avatarSize - ui.gap, 20, chat.user.nickname, chat.user.uid).
          on('valueChange', function() {
        chat.user.nickname = $(this).data('controller').val() ||
          chat.user.uid;
        userUI.invalidate();
        userUpdate();
      }).prepend(createUserState(chat.user).
          on('click', userState_clickHandler) );
      appendEditor(ui.avatarSize - ui.gap, 140, chat.user.message, chat.messages.TODAYS_FEELING, true).
          on('valueChange', function() {
        chat.user.message = $(this).data('controller').val();
        userUI.invalidate();
        userUpdate();
      }).prepend(function() {
        var $cv = $('<canvas width="9" height="9"></canvas>').
          css('margin', '1px 1px 1px 2px').
          css('vertical-align', 'middle').
          attr('title', chat.messages.TIMELINE).
          on('click', function(event) {
            TimeLineUtil.show(null, (uid) => true);
          });
        var ctx = (<any>$cv)[0].getContext('2d');
        ctx.fillStyle = '#999999';
        ctx.fillRect(0, 0, 9, 9);
        ctx.clearRect(1, 1, 7, 7);
        for (var i = 2; i <= 6; i += 2) {
          ctx.fillRect(2, i, 5, 1);
        }
        return $cv;
      }() );
    };

    var createAvatarView = function() {
      return $('<span></span>').
        addClass('wschat-user-view').
        css('display', 'inline-block').
        css('text-align', 'center').
        css('vertical-align', 'middle').
        css('float', 'left').
        css('width', ui.smallAvatarSize + 'px').
        css('height', ui.smallAvatarSize + 'px').
        css('margin-right', '2px');
    };

    var createUserAvatar = function(user : User,
        avatarCache : { [uid : string] : JQuery}) {
      var $view = createAvatarView();
      var avatar = chat.avatars[user.uid];
      if (avatar) {
        var $imgCache = avatarCache[user.uid];
        if ($imgCache) {
          $imgCache.remove();
          appendImage($view, $imgCache);
        } else {
          loadImage($chatUI, avatar, ui.smallAvatarSize,
            function($img : JQuery) {
              avatarCache[user.uid] = $img;
              appendImage($view, $img);
            });
        }
      }
      return $view;
    };

    var createUser = function(user : User,
        avatarCache : { [uid : string] : JQuery}) {
      var nickname = util.getUserNickname(user);
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
            text(nickname) ).
        append($('<br/>') ).
        append(util.applyDecoration( $('<span></span>').
            text(user.message || '\u3000').
            attr('title', user.message) ) );
      return $('<div></div>').
        addClass('wschat-users-cell').
        addClass('wschat-mouse-enabled').
        css('width', (ui.leftWidth - ui.pad) + 'px').
        css('padding', '2px').
        css('cursor', 'default').
        data('uid', user.uid).
        append(createUserAvatar(user, avatarCache) ).
        append($body).append($('<br/>').css('clear', 'both') );
    };

    var setAddToGroupAction = function($cell : JQuery, user : User) {
      draggable(
        $chatUI,
        function() {
          // no-cache
          return createUser(user, {});
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
    };

    var createGroupUserAvatar = function() {

      var $cv = <any>$('<canvas></canvas>').
        attr({width : ui.smallAvatarSize, height : ui.smallAvatarSize});
      var ctx = $cv[0].getContext('2d');

      var size = ui.smallAvatarSize * 0.8;

      var draw = function(x : number, y : number) {

        ctx.fillStyle = '#999999';
        ctx.save();
        ctx.translate(x - 1, y - 1);
        drawAvatar(ctx, size + 2, size + 2);
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.save();
        ctx.translate(x, y);
        drawAvatar(ctx, size, size);
        ctx.restore();
      };

      draw(0, 0);
      draw(ui.smallAvatarSize - size, 2);
      draw( (ui.smallAvatarSize - size) / 2,
         ui.smallAvatarSize - size);

      return createAvatarView().append($cv);
    };

    var createGroupUser = function(
      groupUser : { gid : string, nickname : string }
    ) {
      var $body = $('<span></span>').
        css('display', 'inline-block').
        css('vertical-align', 'middle').
        css('float', 'left').
        css('width', (ui.leftWidth - ui.pad -
            ui.smallAvatarSize - ui.pad * 2) + 'px').
        css('overflow', 'hidden').
        css('text-overflow', 'ellipsis').
        css('white-space', 'nowrap').
        append(createGroupState(chat.groups[groupUser.gid]) ).
        append($('<span></span>').
          css('vertical-align', 'middle').
          text(groupUser.nickname) );
      return $('<div></div>').
        addClass('wschat-group-users-cell').
        addClass('wschat-mouse-enabled').
        css('width', (ui.leftWidth - ui.pad) + 'px').
        css('padding', '2px').
        css('cursor', 'default').
        data('gid', groupUser.gid).
        append(createGroupUserAvatar() ).
        append($body).append($('<br/>').css('clear', 'both') );
    };

    var usersUIUtil = {
      getSortedContacts : function() {
  
        var contacts : any[] = [];
        var sortId = '.sort';
  
        for (var uid in chat.users) {
          var user : any = chat.users[uid];
          user[sortId] = {
            state : util.getUserStateOrder(getUserState(user) ),
            nickname : util.getUserNickname(user)
          };
          contacts.push(user);
        }
  
        var groupContacts = util.getGroupContacts();
        for (var gid in groupContacts) {
          var groupContact = groupContacts[gid];
          var group = chat.groups[groupContact.gid];
          var nickname = getGroupInfo(group).nickname;
          var contact : any = {
            gid : groupContact.gid,
            nickname : nickname
          };
          contact[sortId] = {
            state : usersUIUtil.getGroupState(group),
            nickname : nickname
          };
          contacts.push(contact);
        }
  
        contacts.sort(function (c1, c2) {
          var s1 = c1[sortId];
          var s2 = c2[sortId];
          if (s1.state != s2.state) {
            return s1.state < s2.state? -1 : 1;
          }
          return s1.nickname < s2.nickname? -1 : 1;
        });
  
        for (var i = 0; i < contacts.length; i += 1) {
          delete contacts[i][sortId];
        }
  
        return contacts;
      },
      getGroupState : function(group : Group) {
        var state = 1;
        for (var uid in group.users) {
          if (uid == chat.user.uid) {
            continue;
          }
          var user = chat.users[uid];
          state = Math.min(state, util.getUserStateOrder(getUserState(user) ) );
        }
        return state;
      },
      appendUserContact : function(user : User) {
        var $cell = createUser(user, usersAvatarCache).
          on('mousedown', function(event) {
            event.preventDefault();
          }).
          on('click', function(event) {
            $msg.trigger('blur');
            setSelectedGid(null);
            setSelectedUser(user.uid, event.ctrlKey || event.metaKey);
          });
        $users.append($cell);
        setAddToGroupAction($cell, user);
      },
      appendGroupContact : function(groupUser : any) {
        var $cell = createGroupUser(groupUser).
          on('mousedown', function(event) {
            event.preventDefault();
          }).
          on('click', function(event) {
            $msg.trigger('blur');
            setSelectedUser(null);
            setSelectedGid(groupUser.gid);
          });
        $users.append($cell);
      }
    };

    usersUI.validate = function() {
      $users.children().remove();
      $.each(usersUIUtil.getSortedContacts(), function(i, contact) {
        if (typeof contact.uid != 'undefined') {
          usersUIUtil.appendUserContact(contact);
        } else {
          usersUIUtil.appendGroupContact(contact);
        }
      });
      updateSelectedUsers();
    };

    var getGroupInfo = function(group : Group) {
      var users : string[] = [];
      $.each(group.users, function(uid, user) {
        if (chat.user.uid != uid) {
          users.push(uid);
        }
      });
      users.sort(function (u1, u2) {
        return u1 < u2? -1 : 1;
      });
      var defaultNickname = '';
      $.each(users, function(i, uid) {
        if (defaultNickname) {
          defaultNickname += ', ';
        }
        var nickname = chat.users[uid]?
            chat.users[uid].nickname : group.users[uid].nickname;
        defaultNickname += (nickname || uid);
      });
      return {
        nickname : group.nickname || defaultNickname,
        defaultNickname : defaultNickname,
        users : users,
        contactGroup : users.length == 1 &&
          (!chat.users[users[0]] || chat.users[users[0]].gid == group.gid)
      };
    };

    var createGroup = function(group : Group) {

      var groupInfo = getGroupInfo(group);

      var $cell = $('<div></div>').
        addClass('wschat-groups-cell').
        addClass('wschat-mouse-enabled').
        css('width', (ui.leftWidth - ui.pad) + 'px').
        css('padding', '2px').
        css('cursor', 'default').
        css('overflow', 'hidden').
        css('text-overflow', 'ellipsis').
        css('white-space', 'nowrap').
        data('gid', group.gid).
        on('mousedown', function(event) {
          event.preventDefault();
        }).
        on('click', function(event) {
          $msg.trigger('blur');
          setSelectedUser(null);
          setSelectedGid(group.gid);
        });
      if (groupInfo.contactGroup) {
        $cell.append(createUserState(chat.users[groupInfo.users[0]]));
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
          attr('title', groupInfo.defaultNickname).
          text(groupInfo.nickname) );
      $cell.append(createMessageState(group.newMsg) );
      if (group.newMsg) {
        $cell.addClass('wschat-new-msg');
      }
      if (group.gid == getSelectedGid() ) {
        $cell.addClass('wschat-selected');
      }
      if (groupInfo.users.length == 1) {
        setAddToGroupAction($cell, chat.users[groupInfo.users[0]]);
      }
      return $cell;
    };

    groupsUI.validate = function() {
      var newMsg = false;
      $groups.children().remove();
      var groups : Group[] = [];
      $.each(chat.groups, function(gid, group) {
        var msgCount = 0;
        var newMsgCount = 0;
        $.each(group.messages, function(mid, message) {
          msgCount += 1;
          if (message.newMsg) {
            newMsgCount += 1;
          }
          if (group.maxDate < message.date) {
            group.maxDate = message.date;
          }
        });
        if (msgCount == 0) {
          // msg not available.
          return;
        }
        group.newMsg = newMsgCount > 0;
        if (group.newMsg) {
          newMsg = true;
        }
        groups.push(group);
      });
      $groupsTab.data('controller').setNewMsg(newMsg);
      if (!newMsg) {
        notifyTitle.stop();
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
          $header.addClass('wschat-prev-button').
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
        append($('<span></span>').text('\u000a') ).
        append($('<span></span>').addClass('wschat-thread-msg-body').
            css('display', 'inline-block').
            css('word-wrap', 'break-word').
  //          css('white-space', 'pre').
            css('vertical-align', 'top').
            css('text-align', 'left').
            css('width', ui.bodyWidth + 'px').
            css('margin-right', ui.gap + 'px') ).
        append($('<span></span>').text('\u000a') ).
        append($('<span></span>').addClass('wschat-thread-msg-date').
            css('display', 'inline-block').
            css('text-align', 'left').
            css('width', ui.dateWidth + 'px') );
    };

    var getThreadCells = function() {
      return $thread.children('.wschat-thread-cells');
    };
    var getThreadCellsContent = function() {
      return getThreadCells().children('.wschat-thread-cells-content');
    };

    var updateThreadContent = function(
      update : ($cellsContent : JQuery, $cells : JQuery) => void
    ) {

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

      var $bottom = function() {
        var $currCells = $cellsContent.children('.wschat-thread-cell');
        return $currCells.length > 0?
          $($currCells[$currCells.length - 1]) : null;
      }();
      var lastTop = 0;
      if ($bottom) {
        lastTop = $bottom.offset().top;
      }

      update($cellsContent, $cells);

      if ($bottom) {
        threadScrollTop +=  $bottom.offset().top  - lastTop;
      }

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
        data('mid', message.mid).
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

    $(document).on('contextmenu', function(event) {
      var $cell = $(event.target).closest('.wschat-thread-message');
      var $users = $(event.target).closest('.wschat-users-cell');
      var $groupUsers = $(event.target).closest('.wschat-group-users-cell');
      var $groups = $(event.target).closest('.wschat-groups-cell');
      if ($cell.length != 0) {
        event.preventDefault();
        var msgMenu = $cell.data('msgMenu');
        if (msgMenu != null) {
          msgMenu.showMenu($cell).
            css('left', event.pageX + 'px').
            css('top', event.pageY + 'px');
        }
      } else if ($users.length != 0) {
        event.preventDefault();
        userContactMenu.showMenu($users).
          data('uid', $users.data('uid') ).
          css('left', event.pageX + 'px').
          css('top', event.pageY + 'px');
      } else if ($groupUsers.length != 0) {
        event.preventDefault();
        groupContactMenu.showMenu($groupUsers).
          data('gid', $groupUsers.data('gid') ).
          css('left', event.pageX + 'px').
          css('top', event.pageY + 'px');
      } else if ($groups.length != 0) {
        event.preventDefault();
        !function($menu : JQuery) {
          var gid = $groups.data('gid');
          var userGid = false;
          $.each(chat.users, function(uid, user) {
            if (user.gid == gid) {
              userGid = true;
            }
          });
          var showAddToContacts = !userGid && !util.getGroupContacts()[gid];
          if (!showAddToContacts) {
            $menu.children().first().remove();
          }
        }(groupMenu.showMenu($groups).
          data('gid', $groups.data('gid') ).
          css('left', event.pageX + 'px').
          css('top', event.pageY + 'px') );
      } else if ($(event.target).closest('.wschat-menu').length != 0) {
        event.preventDefault();
      }
    } );

    var appendEditMenu = function(gid : string,
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
      var msgSaveHandler = function() {
        var quoteRe = /"/g
        var quote = function(s : string) {
          return '"' + s.replace(quoteRe, '""') + '"';
        };
        var csv = '';
        var $cellsContent = getThreadCellsContent();
        $cellsContent.children().each(function(i) {
          var $cell = $(this);
          var message : Message = $cell.data('message');
          if (!message) {
            return;
          } else if (!message.uid || message.uid == '$sys') {
            return;
          }
          csv += quote(message.nickname);
          csv += '\t';
          csv += quote(message.message);
          csv += '\t';
          csv += quote(getTimestampLabel(message.date) );
          csv += '\r\n';
        });
        /*
        saveData('application/octet-stream',
          csv, getTimestamp() + '_UTF-8.txt');
        */
        var $tmp = $('<textarea></textarea>').val(csv);
        $('BODY').append($tmp);
        $tmp.select();
        document.execCommand('copy');
        $tmp.remove();

        msgMenu.hideMenu();
      };

      var msgMenu = createMenu($chatUI, function($menu) {
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
        if (isSaveDataSupported() && getThreadCellsContent().length > 0) {
          $menu.append(createMenuItem(chat.messages.COPY_ALL).
              on('click', msgSaveHandler) );
        }
      });
      $cell.data('msgMenu', msgMenu);
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

        var $body = $cell.children('.wschat-thread-msg-body');
        $body.html('');
        parseLine(message.message, function(line : string) {
          if (line == '\u0020') {
            $body.append('&#160;');
          } else if (line == '\t') {
            $body.append('&#160;&#160;&#160;&#160;');
          } else if (line == '\n') {
            $body.append($('<br/>') );
          } else {
            var $line = $('<span></span>').text(line);
            $body.append($line);
            util.applyDecoration($line);
          }
        });

        //$cell.children('.wschat-thread-msg-body').text(message.message);
        //applyDecoration($cell.children('.wschat-thread-msg-body'));
        $cell.data('msgMenu', null);

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
          appendEditMenu(gid, message, $cell);
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
      $threadUsers.children().each(function() {
        if (chat.selectedUid == $(this).data('uid') ) {
          $(this).addClass('wschat-selected');
        } else {
          $(this).removeClass('wschat-selected');
        }
      });
    };

    var updateSelectedThread = function() {
      var $cellsContent = getThreadCellsContent();
      $cellsContent.children().each(function() {
        if (chat.selectedMid == $(this).data('mid') ) {
          $(this).addClass('wschat-selected');
        } else {
          $(this).removeClass('wschat-selected');
        }
      });
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
        css('padding', ui.pad + 'px').
        css('display', 'inline-block').
        css('vertical-align', 'top').
        data('uid', uid).
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
        var avatar = chat.avatars[uid] || getDefaultAvatar();
        appendImage($view, $('<img/>').attr('src', avatar) );
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
          $chatUI,
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
        var $editor = $('<div></div>').
          css('margin', '2px').
          css('float', 'left');

        if (group) {
          var groupInfo = getGroupInfo(group);
          var nickname = groupInfo.nickname;
          createEditor($editor, 200, 20, nickname, null);
          $editor.data('controller').val(group.nickname || nickname);
          $editor.on('valueChange', function(event) {
              send({
                action : 'group',
                changeGroupName : !groupInfo.contactGroup,
                group : {
                  gid : group.gid,
                  nickname : $(this).data('controller').val() || null
                }
              });
            })
        }

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
            var dlg = createDialog($chatUI);
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
          append($editor).
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
            $btn.addClass('wschat-prev-button').
              on('click', function() {
                chat.groupPrevs[gid] = i + 1;
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

      $rightPane.
        css('width', (ui.userWidth + ui.bodyWidth + ui.dateWidth +
          ui.rightBarWidth + ui.gap * 2 + ui.pad * 2) + 'px');
      $threadUsers.
        css('height', ui.threadUserHeight + 'px');
      $msg.
        css('width', ui.bodyWidth + 'px').
        css('height', ui.msgHeight + 'px');

      updateThreadContent(function($cellsContent, $cells) {
        $cells.
          css('height', (ui.height - ui.msgHeight) + 'px');
        $cellsContent.
          children('.wschat-thread-cell').
          children('.wschat-thread-msg-body').
              css('width', ui.bodyWidth + 'px');
        $cellsContent.
          children('.wschat-search-header').
              css('width', ui.bodyWidth + 'px');
      });

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
      try {

        validateThreadMessages();

        $.each(uiList, function(i, ui) {
          if (!ui.valid) {
            ui.validate();
            ui.valid = true;
          }
        });
      } finally {
        window.setTimeout(validateUI, 50);
      }
    };

    validateUI();

    return $chatUI;
  };
}
