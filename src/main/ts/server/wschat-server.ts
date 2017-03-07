//
// wschat-server
//
// @author Kazuhiko Arase
//

'use strict';
namespace wschat.server {

  declare var Java : any;

  declare var context : any;
  declare var $logger : any;
  declare var $global : any;
  declare var $servletContext : any;
  declare var $request : any;
  declare var $session : any;

  export var JQThinStatic : JQThin = {
    each : function(it : any, f : any) {
      if (typeof it.splice == 'function') {
        for (var i = 0; i < it.length; i += 1) {
          f(i, it[i]);
        }
      } else {
        for (var k in it) {
          f(k, it[k]);
        }
      }
    }
  };

  var $ = JQThinStatic;

  export var console = {
    log: function(msg : string) {
      $logger.info(msg);
    }
  };

  var loadStream = function(stream : any) {
    var bout = new (Java.type('java.io.ByteArrayOutputStream'))();
    try {
      var fin = new (Java.type('java.io.BufferedInputStream'))(stream);
      try {
        var buf = Java.type('java.lang.reflect.Array').newInstance(
              Java.type('java.lang.Byte').TYPE, 4096);
        var len : number;
        while ( (len = fin.read(buf) ) != -1) {
          bout.write(buf, 0, len);
        }
      } finally {
        fin.close();
      }
    } finally {
      bout.close();
    }
    return bout.toByteArray();
  };

  var loadMessage = function(lang : string) {
    var filename = context.getAttribute('javax.script.filename');
    var index = filename.lastIndexOf('/');
    if (index == -1) {
      throw 'bad filename:' + filename;
    }
    var getResIn = function(lang : string) {
      return $servletContext.getResourceAsStream(
          filename.substring(0, index + 1) +
          'messages_' + lang + '.json');
    };
    var resIn = getResIn(lang);
    if (resIn == null && lang.indexOf('-') != -1) {
      resIn = getResIn(lang.replace(/\-.+$/, '') );
    }
    if (resIn == null) {
      resIn = getResIn('en');
    }
    return JSON.parse('' + new (Java.type('java.lang.String'))(
        loadStream(resIn), 'UTF-8') );
  };

  var messageFormat : any = function() {
    var args = Java.type('java.lang.reflect.Array').newInstance(
        Java.type('java.lang.Class').forName('java.lang.Object'),
        arguments.length - 1);
    for (var i = 1; i < arguments.length; i += 1) {
      args[i - 1] = new (Java.type('java.lang.String'))(arguments[i]);
    }
    return '' + Java.type('java.text.MessageFormat').format(arguments[0], args);
  };

  var getTime = function() {
    return Java.type('java.lang.System').currentTimeMillis();
  };

  var sync = function(lock : any, sync : any) {
    Java.type('ws.ISync').sync.sync(lock,
        new (Java.type('ws.ISync'))({ sync : sync }) );
  };

  var createService = function() : ChatService {

    var service = Java.type('wschat.ChatServiceHolder').
      getInstance($servletContext);

    var toJavaOpts = function(opts : any) {
      var javaOpts = new (Java.type('java.util.HashMap'))();
      $.each(opts, function(k, v) {
        javaOpts.put(
            new (Java.type('java.lang.String'))('' + k),
            new (Java.type('java.lang.String'))('' + v));
      });
      return javaOpts;
    };
    var toJsString = function(s : any) : string {
      return (s != null)? '' + s : null;
    };
    var toJsUser = function(javaUser : any) : User {
      var user = JSON.parse(javaUser.getJsonData() );
      user.uid = toJsString(javaUser.getUid());
      user.nickname = user.nickname || user.uid;
      user.contacts = {};
      for (var i = 0; i < javaUser.getContacts().size(); i += 1) {
        var javaContact = javaUser.getContacts().get(i);
        var uid = toJsString(javaContact.getUid());
        var gid = toJsString(javaContact.getGid());
        user.contacts[uid] = {gid: gid};
      }
      return user;
    };
    var toJsUserJSON = function(javaUser : any) {
      var user = JSON.parse(javaUser.getJsonData() );
      user.uid = toJsString(javaUser.getUid());
      user.nickname = user.nickname || user.uid;
      user.contacts = [];
      for (var i = 0; i < javaUser.getContacts().size(); i += 1) {
        var javaContact = javaUser.getContacts().get(i);
        var uid = toJsString(javaContact.getUid());
        var gid = toJsString(javaContact.getGid());
        user.contacts.push({uid: uid, gid: gid});
      }
      user.contacts.sort(function(c1 : any, c2 : any) {
        return c1.uid < c2.uid? -1 : 1;
      });
      return JSON.stringify(user);
    };
    var toJsGroup = function(javaGroup : any) : Group {
      var group = JSON.parse(javaGroup.getJsonData() );
      group.gid = toJsString(javaGroup.getGid() );
      group.minDate = +javaGroup.getMinDate();
      group.maxDate = +javaGroup.getMaxDate();
      group.users = {};
      for (var i = 0; i < javaGroup.getUsers().size(); i += 1) {
        var user = javaGroup.getUsers().get(i);
        group.users[toJsString(user.getUid())] =
          JSON.parse(user.getJsonData() );
      }
      group.messages = {};
      return group;
    };
    var toJsMessage = function(javaMessage : any) : Message {
      var message = JSON.parse(javaMessage.getJsonData() );
      if (message.file && !message.file.deleted) {
        var file = new (Java.type('java.io.File'))(
          getRepository(), message.file.tmpfile);
        if (!file.exists() ) {
          message.file.deleted = true;
          javaMessage.setJsonData(JSON.stringify(message) );
          service.updateMessage(javaMessage);
        }
      }
      return message;
    };
    var newJsGroupUser = function(uid : string) {
      var jsUser = getUser(uid);
      return {
        uid: uid,
        nickname: jsUser.nickname || uid
      };
    };
    var newJavaGroupUser = function(uid : string) {
      var javaUser = new (Java.type('wschat.GroupUser'))();
      javaUser.setUid(uid);
      javaUser.setJsonData(JSON.stringify(newJsGroupUser(uid) ) );
      return javaUser;
    };

    var doLogin = function(uid : string) {
      return getUser(uid);
    };
    var getUser = function(uid : string) {
      var javaUser = service.getUser(uid);
      if (javaUser == null) {
        return null;
      }
      return toJsUser(javaUser);
    };
    var updateUser = function(user : User) {
      var javaUser = service.getUser(user.uid);
      var oldUser = toJsUserJSON(javaUser);
      javaUser.setJsonData(JSON.stringify({
        nickname: user.nickname,
        message: user.message,
        state: user.state
      }));
      if (user.contacts) {
        javaUser.getContacts().clear();
        $.each(user.contacts, function(uid, contact) {
          var javaContact = new (Java.type('wschat.Contact'))();
          javaContact.setUid(uid);
          javaContact.setGid(contact.gid);
          javaUser.getContacts().add(javaContact);
        });
      }
      var newUser = toJsUserJSON(javaUser);
      if (oldUser != newUser) {
        service.updateUser(javaUser);
      }
    };
    var getAvatar = function(uid : string) {
      return toJsString(service.getAvatar(uid, 120) );
    };
    var getRepository = function() {
      return new (Java.type('java.io.File'))($servletContext.
          getAttribute('javax.servlet.context.tempdir') );
    };
    var updateAvatar = function(uid : string, file : AttachedFile) {
      var repo = getRepository();
      var tmpfile = new (Java.type('java.io.File'))(repo, file.tmpfile);
      if (!tmpfile.getParentFile().equals(repo) ) {
        throw '' + tmpfile;
      }
      var data = Java.type('ws.util.Base64').toUrl(
          file.contentType, tmpfile.getCanonicalPath() );
      service.updateAvatar(uid, data, 120);
      tmpfile['delete']();
    };
    var newUser = function(user : NewUser) {
      var javaUser = new (Java.type('wschat.User'))();
      javaUser.setUid(user.uid);
      javaUser.setJsonData(JSON.stringify({
        nickname: user.nickname || user.uid
      }));
      service.updateUser(javaUser);
    };
    var searchUsers = function(uid : string, keyword : string) {
      var javaUsers = service.searchUsers(uid, keyword);
      var users : GroupUser[] = [];
      for (var i = 0; i < javaUsers.size(); i += 1) {
        var javaUser = javaUsers.get(i);
        var user = JSON.parse(javaUser.getJsonData() );
        user.uid = toJsString(javaUser.getUid());
        user.nickname = user.nickname || user.uid;
        delete user.message;
        delete user.state;
        users.push(user);
      }
      return users;
    };
    var containsUser = function(uid : string, dstUid : string) {
      return !!getUser(dstUid).contacts[uid];
    };
    var createContactGroup = function(uid1 : string, uid2 : string) {
      if (uid1 == uid2) {
        return null;
      }
      var user1 = getUser(uid1);
      var user2 = getUser(uid2);
      if (!user1 || !user2) {
        return null;
      }
      var gid : string = null;
      if (user1.contacts[uid2] && user2.contacts[uid1]) {
        return null;
      } else if (user1.contacts[uid2]) {
        gid = user1.contacts[uid2].gid;
      } else if (user2.contacts[uid1]) {
        gid = user2.contacts[uid1].gid;
      } else {
        gid = newGroup([uid1, uid2]);
      }
      return gid;
    };
    var applyContact = function(uid1 : string, uid2 : string, gid : string) {
      if (uid1 == uid2) {
        return null;
      }
      var user1 = getUser(uid1);
      var user2 = getUser(uid2);
      if (!user1 || !user2) {
        return null;
      }
      user1.contacts[uid2] = {gid: gid};
      user2.contacts[uid1] = {gid: gid};
      updateUser(user1);
      updateUser(user2);
      return gid;
    };
    var removeContact = function(uid : string, targetUid : string) {
      if (uid == targetUid) {
        return null;
      }
      var user = getUser(uid);
      var targetUser = getUser(targetUid);
      if (!user || !targetUser) {
        return null;
      }
      if (user.contacts[targetUid]) {
        var gid = user.contacts[targetUid].gid;
        delete user.contacts[targetUid];
        updateUser(user);
        return gid;
      } else {
        return null;
      }
    };
    var getGroup = function(uid : string, gid : string) {
      return toJsGroup(service.getGroup(uid, gid) );
    };
    var newGroup = function(users : string[]) {
      var javaUsers = new (Java.type('java.util.ArrayList'))();
      $.each(users, function(i, uid) {
        javaUsers.add(newJavaGroupUser(uid) );
      });
      return toJsString(service.newGroup(javaUsers,
          JSON.stringify({})));
    };
    var updateGroup = function(uid : string, group : Group) {
      var javaGroup = new (Java.type('wschat.Group'))();
      javaGroup.setGid(group.gid);
      javaGroup.setMinDate(group.minDate);
      javaGroup.setMaxDate(group.maxDate);
      javaGroup.setJsonData(JSON.stringify({}) );
      $.each(group.users, function(uid, user) {
        javaGroup.getUsers().add(newJavaGroupUser(uid) );
      });
      service.updateGroup(uid, javaGroup);
      return toJsGroup(javaGroup);
    };
    var getGroupUsers = function(group : Group) {
      var users : string[] = [];
      $.each(group.users, function(uid, user) {
        users.push(uid);
      });
      return users;
    };
    var addToGroup = function(uid : string, group : Group, uidToAdd : string) {
      var oldUsers = getGroupUsers(group);
      group.users[uidToAdd] = newJsGroupUser(uidToAdd);
      var newUsers = getGroupUsers(group);
      if (oldUsers.length == 2 && newUsers.length == 3) {
        var getGid = function(uid1 : string, uid2 : string) {
          var user = getUser(uid1);
          if (user) {
            var contact = user.contacts[uid2];
            if (contact) {
              return contact.gid;
            } else {
              return group.gid;
            }
          }
          return null;
        };
        var gid1 = getGid(oldUsers[0], oldUsers[1]);
        var gid2 = getGid(oldUsers[1], oldUsers[0]);
        if (gid1 == null || gid2 == null) {
          return null;
        } else if (group.gid == gid1 && group.gid == gid2) {
          return getGroup(uid, newGroup(newUsers) );
        }
      }
      $.each(newUsers, function(i, uid) {
        updateGroup(uid, group);
      });
      return getGroup(uid, group.gid);
    };
    var removeFromGroup = function(uid : string,
        group : Group, uidToRemove : string) {
      var oldUsers = getGroupUsers(group);
      if (oldUsers.length > 2) {
        delete group.users[uidToRemove];
        $.each(oldUsers, function(i, uid) {
          updateGroup(uid, group);
        });
      }
      return getGroup(uid, group.gid);
    };
    var fetchGroups = function(uid : string, opts : FetchOptions) {
      var javaOpts = toJavaOpts(opts || {});
      var groups : { [gid:string]:Group } = {};
      var javaGroups = service.fetchGroups(uid, javaOpts);
      for (var i = 0; i < javaGroups.size(); i += 1) {
        var group = toJsGroup(javaGroups.get(i) );
        groups[group.gid] = group;
      }
      return groups;
    };

    var newMid = function() {
      return toJsString(service.newMid() );
    };
    var getMessage = function(uid : string, mid : string) {
      return toJsMessage(service.getMessage(uid, mid) );
    };
    var updateMessage = function(uid : string,
        gid : string, message : Message) {
      if (message.deleted && message.file && !message.file.deleted) {
        var file = new (Java.type('java.io.File'))(
          getRepository(), message.file.tmpfile);
        if (file.exists() ) {
          file['delete']();
          message.file.deleted = true;
        }
      }
      var javaMessage = new (Java.type('wschat.Message'))();
      javaMessage.setMid(message.mid);
      javaMessage.setUid(uid);
      javaMessage.setGid(gid);
      javaMessage.setDate(message.date);
      javaMessage.setJsonData(JSON.stringify(message) );
      service.updateMessage(javaMessage);
    };
    var fetchMessages = function(uid : string, gid : string,
        opts : FetchOptions) {
      var javaOpts = toJavaOpts(opts || {});
      var messages : { [mid:string]:Message } = {};
      var javaMessages = service.fetchMessages(uid, gid, javaOpts);
      for (var i = 0; i < javaMessages.size(); i += 1) {
        var message = toJsMessage(javaMessages.get(i) );
        messages[message.mid] = message;
      }
      return messages;
    };

    var newDataId = function() {
      return '' + service.newDataId();
    };
    var updateUserData = function(userData : any) {
      var javaUserData = new (Java.type('wschat.UserData'))();
      javaUserData.setDataId(userData.dataId);
      javaUserData.setDataType(userData.dataType);
      javaUserData.setUid(userData.uid);
      javaUserData.setJsonData(JSON.stringify(userData) );
      service.updateUserData(javaUserData);
      return userData;
    };
    var getUserData = function(dataId : string) : any {
      return JSON.parse(service.getUserData(dataId).getJsonData() );
    };
    var deleteUserData = function(dataId : string) {
      service.deleteUserData(dataId);
    };
    var fetchUserData = function(uid : string) {
      var javaUserDataList = service.fetchUserData(uid);
      var userDataList : any[] = [];
      for (var i = 0; i < javaUserDataList.size(); i += 1) {
        userDataList.push(JSON.parse(javaUserDataList.get(i).getJsonData() ) );
      }
      return userDataList;
    };

    var putUserSession = function(uid : string, sid : string, data : any) {
      service.putUserSession(uid, sid, JSON.stringify(data));
    };
    var getUserSession = function(uid : string, sid : string) {
      var data = service.getUserSession(uid, sid);
      return data != null? JSON.parse(data) : null;
    };
    var removeUserSession = function(uid : string, sid : string) {
      service.removeUserSession(uid, sid);
    };
    var getUserSessionIdList = function(uid : string) {
      var sidList = service.getUserSessionIdList(uid);
      var sids : string[] = [];
      for (var i = 0; i < sidList.size(); i += 1) {
        sids.push(toJsString(sidList.get(i)));
      }
      return sids;
    };

    return {
      putUserSession: putUserSession,
      getUserSession: getUserSession,
      removeUserSession: removeUserSession,
      getUserSessionIdList: getUserSessionIdList,

      doLogin: doLogin,
      getUser: getUser,
      updateUser: updateUser,
      getAvatar: getAvatar,
      updateAvatar: updateAvatar,
      newUser: newUser,
      searchUsers: searchUsers,
      containsUser: containsUser,
      applyContact: applyContact,
      removeContact: removeContact,
      createContactGroup: createContactGroup,

      newGroup: newGroup,
      getGroup: getGroup,
      addToGroup: addToGroup,
      removeFromGroup: removeFromGroup,
      fetchGroups: fetchGroups,

      newMid: newMid,
      getMessage: getMessage,
      updateMessage: updateMessage,
      fetchMessages: fetchMessages,

      newDataId: newDataId,
      updateUserData: updateUserData,
      getUserData: getUserData,
      deleteUserData: deleteUserData,
      fetchUserData: fetchUserData
    };
  };

  var createChatEndpoint = function() {

    var chatService = createChatService(createService() );

    var chat : {user : User, messages? : any} = {
      user: null
    };

    var isGroupMember = function(group : Group) {
      var found = false;
      $.each(group.users, function(uid) {
        if (uid == chat.user.uid) {
          found = true;
        }
      });
      return found;
    };

    var getNickname = function(uid : string) {
      var user = chatService.getUser(uid);
      return user.nickname || user.uid;
    };

    var send = function(data : any, uid? : string) {
      var msg = JSON.stringify(data);
      if (arguments.length == 1) {
        sync($session, function() {
          $session.getBasicRemote().sendText(msg);
        } );
      } else {
        var sids = chatService.getUserSessionIdList(uid);
        var cleanups : string[] = [];
        $.each(sids, function(i, sid) {
          var context = $global.get('contextMap').get(sid);
          if (context == null) {
            cleanups.push(sid);
            return;
          }
          var session = context.getSession();
          sync(session, function() {
            try {
              session.getBasicRemote().sendText(msg);
            } catch(e) {
              $global.get('contextMap').remove(sid);
              cleanups.push(sid);
            }
          });
        });
        $.each(cleanups, function(i, sid) {
          console.log('!session cleanup:' + sid);
          chatService.removeUserSession(uid, sid);
        });
      }
    };

    var sendSystemMessage = function(group : Group, systemMessage : string) {
      var mid = chatService.newMid();
      $.each(group.users, function(uid) {
        var message = {
          mid: mid,
          uid: '$sys',
          nickname: '$sys',
          message: systemMessage,
          date: getTime(),
          newMsg: true
        };
        chatService.updateMessage(uid, group.gid, message);
        send({action:'message',
          gid: group.gid,
          message: message
        }, uid);
      });
    };

    var actions : ServerActions = {};

    actions.login = function(data) {

      chat.user = chatService.doLogin(data.uid);
      if (chat.user == null) {
        data.status = 'failure';
        send(data);
        return;
      }
      chat.messages = loadMessage(data.lang || 'en');
      data.user = {
        uid: chat.user.uid,
        nickname: chat.user.nickname,
        message: chat.user.message,
        state: chat.user.state
      };
      data.status = 'success';
      data.messages = chat.messages;
      send(data);

      var sendUserData = function(uid : string) {
        send({
          action: 'avatar',
          uid: uid,
          data: chatService.getAvatar(uid)
        });
        $.each(chatService.fetchUserData(uid), function(i, userData) {
          send({
            action: 'userData',
            data: userData
          });
        });
      };

      sendUserData(chat.user.uid);

      $.each(chat.user.contacts, function(uid, contact) {
        var user = chatService.getUser(uid);
        send({
          action: 'user',
          user:{
            uid: user.uid,
            gid: contact.gid,
            nickname: user.nickname,
            message: user.message,
            state: user.state,
            date: 0
          }
        });
        var group = chatService.getGroup(chat.user.uid, contact.gid);
        send({
          action: 'group',
          group: group
        });

        sendUserData(user.uid);
      });
    };

    actions.user = function(data) {

      if (data.user.date == null) {
        data.user.date = getTime();
      }
      chatService.updateUser(data.user);
      chatService.putUserSession(chat.user.uid, $session.getId(), data);
      chat.user = chatService.getUser(chat.user.uid);
      send(data, chat.user.uid);
      $.each(chat.user.contacts, function(uid, contact) {
        if (chatService.containsUser(chat.user.uid, uid) ) {
          data.user.gid = contact.gid;
          send(data, uid);
        }
      });
    };

    actions.updateAvatar = function(data) {

      chatService.updateAvatar(chat.user.uid, data.file);
      var avatarData = {
        action: 'avatar',
        uid: chat.user.uid,
        data: chatService.getAvatar(chat.user.uid)
      };
      send(avatarData, chat.user.uid);
      $.each(chat.user.contacts, function(uid, contact) {
        if (chatService.containsUser(chat.user.uid, uid) ) {
          send(avatarData, uid);
        }
      });
    };

    actions.updateUserData = function(data) {

      var userData : any = {
        action: 'userData'
      };

      if (data['delete']) {
        chatService.deleteUserData(data.userData.dataId);
        userData.dataId = data.userData.dataId;
        userData['delete'] = true;
      } else if (data.create) {
        data.userData.dataId = chatService.newDataId();
        data.userData.uid = chat.user.uid;
        chatService.updateUserData(data.userData);
        userData.data = chatService.getUserData(data.userData.dataId);
      } else {
        chatService.updateUserData(data.userData);
        userData.data = chatService.getUserData(data.userData.dataId);
      }

      send(userData, chat.user.uid);
      $.each(chat.user.contacts, function(uid, contact) {
        if (chatService.containsUser(chat.user.uid, uid) ) {
          send(userData, uid);
        }
      });
    };

    actions.searchUsers = function(data) {
      data.users = chatService.searchUsers(chat.user.uid, data.keyword);
      send(data);
    };

    actions.newGroup = function(data) {

      if (data.users.length < 1) {
        return;
      }

      var users : string[] = [chat.user.uid];
      $.each(data.users, function(i, uid) {
        users.push(uid);
      });
      users.sort(function(u1, u2) {
        return u1 < u2? -1 : 1;
      });

      if (users.length == 2) {
        if (!chatService.containsUser(users[0], users[1]) ||
            !chatService.containsUser(users[1], users[0]) ) {
          return;
        }
      }

      data.gid = chatService.newGroup(users);
      send(data);

      $.each(users, function(i, uid) {
        var group = chatService.getGroup(uid, data.gid);
        send({
          action: 'group',
          group: group
        }, uid);
      });

      if (users.length > 2) {
        var nicknames = '';
        $.each(users, function(i, uid) {
          if (uid != chat.user.uid) {
            if (nicknames) {
              nicknames += ', ';
            }
            nicknames += getNickname(uid);
          }
        });
        sendSystemMessage(
            chatService.getGroup(chat.user.uid, data.gid),
            messageFormat(
              chat.messages.ADD_TO_GROUP,
              getNickname(chat.user.uid),
              nicknames) );
      }

      if (data.message != null) {
        onMessageImpl({
          action: 'postMessage',
          gid: data.gid,
          message: data.message
        });
      }
    };

    actions.requestAddToContacts = function(data) {

      var gid = chatService.createContactGroup(chat.user.uid, data.uid);
      if (gid != null) {

        data.gid = gid;
        send(data);

        onMessageImpl({
          action: 'postMessage',
          gid: gid,
          newGroup: true,
          message: {
            message: data.message,
            requestAddToContacts: true,
            requestAddToContactsUid: data.uid
          }
        });
      }
    };

    actions.acceptContact = function(data) {

      var users = [chat.user.uid, data.uid];
      var gid = chatService.applyContact(users[0], users[1], data.gid);

      if (gid != null) {

        send(data, users[0]);
        send(data, users[1]);

        var sendUser = function(uid1 : string, uid2 : string) {
          var user = chatService.getUser(uid1);
          send({
            action: 'user',
            user:{
              uid: user.uid,
              gid: gid,
              nickname: user.nickname,
              message: user.message,
              state: user.state,
              date: getTime()
            }
          }, uid2);
          send({
            action: 'avatar',
            uid: user.uid,
            data: chatService.getAvatar(user.uid)
          }, uid2);
        };
        sendUser(users[0], users[1]);
        sendUser(users[1], users[0]);
      }
    };

    actions.removeContact = function(data) {
      var gid = chatService.removeContact(chat.user.uid, data.uid);
      if (gid != null) {
        send(data, chat.user.uid);
      }
    };

    actions.addToGroup = function(data) {

      var group = chatService.getGroup(chat.user.uid, data.gid);

      if (isGroupMember(group) ) {

        group = chatService.addToGroup(chat.user.uid, group, data.uid);
        if (group != null) {
          data.group = group;
          send(data);
          $.each(group.users, function(uid, user) {
            send({
              action: 'group',
              group: group
            }, uid);
          });
          sendSystemMessage(group, messageFormat(
              chat.messages.ADD_TO_GROUP,
              getNickname(chat.user.uid),
              getNickname(data.uid) ) );
        }
      }
    };

    actions.removeFromGroup = function(data) {

      var group = chatService.getGroup(chat.user.uid, data.gid);
      if (isGroupMember(group) ) {
        var oldGroup : Group = JSON.parse(JSON.stringify(group) );
        group = chatService.removeFromGroup(chat.user.uid, group, data.uid);
        data.group = group;
        send(data);
        $.each(oldGroup.users, function(uid, user) {
          send({
            action: 'group',
            group: group
          }, uid);
        });
        sendSystemMessage(oldGroup, messageFormat(
            chat.messages.REMOVE_FROM_GROUP,
            getNickname(chat.user.uid),
            getNickname(data.uid) ) );
      }
    };

    actions.exitFromGroup = function(data) {

      var group = chatService.getGroup(chat.user.uid, data.gid);
      if (isGroupMember(group) ) {
        var oldGroup : Group = JSON.parse(JSON.stringify(group) );
        group = chatService.removeFromGroup(
          chat.user.uid, group, chat.user.uid);
        data.group = group;
        send(data);
        $.each(oldGroup.users, function(uid, user) {
          send({
            action: 'group',
            group: group
          }, uid);
        });
        sendSystemMessage(oldGroup, messageFormat(
            chat.messages.EXIT_FROM_GROUP,
            getNickname(chat.user.uid) ) );
      }
    };

    actions.fetchGroups = function(data) {
      $.each(chatService.fetchGroups(chat.user.uid, data.opts),
        function(gid, group) {
          send({
            action: 'group',
            group: group
          });
        });
    };

    actions.message = function(data) {

      if (!data.notifyAll) {
        chatService.updateMessage(chat.user.uid, data.gid, data.message);
        send(data, chat.user.uid);
      } else {
        var group = chatService.getGroup(chat.user.uid, data.gid);
        if (isGroupMember(group) ) {
          $.each(group.users, function(uid) {
            chatService.updateMessage(uid, data.gid, data.message);
            send(data, uid);
          });
        }
      }
    };

    actions.fetchMessages = function(data) {
      $.each(chatService.fetchMessages(chat.user.uid, data.gid, data.opts),
        function(mid, message) {
          send({action:'message',
            gid: data.gid,
            message: message
          });
        });
    };

    actions.postMessage = function(data) {

      var group = chatService.getGroup(chat.user.uid, data.gid);

      if (isGroupMember(group) ) {

        if (data.newGroup) {
          $.each(group.users, function(uid) {
            send({
              action: 'group',
              group: group
            }, uid);
          });
        }

        var mid = chatService.newMid();
        $.each(group.users, function(uid) {

          var message = data.message;
          message.mid = mid;
          message.uid = chat.user.uid;
          message.nickname = chat.user.nickname;
          message.date = getTime();
          message.newMsg = uid != chat.user.uid;

          chatService.updateMessage(uid, data.gid, message);
          send({action:'message',
            gid: data.gid,
            message: message
          }, uid);
        });
      }
    };

    actions.typing = function(data) {

      var group = chatService.getGroup(chat.user.uid, data.gid);
      if (isGroupMember(group) ) {
        data.uid = chat.user.uid;
        data.nickname = chat.user.nickname;
        $.each(group.users, function(uid) {
          if (chat.user.uid != uid) {
            send(data, uid);
          }
        });
      }
    };

    actions.download = function(data) {
      data.message = chatService.getMessage(chat.user.uid, data.mid);
      send(data);
    };

    var onOpen = function(config : any) {
      console.log('open/sid=' + $session.getId() );
    };

    var onClose = function(closeReason : any) {
      console.log('close/sid=' + $session.getId() );
      if (chat.user) {
        $.each(chat.user.contacts, function(uid, contact) {
          send({
            action: 'user',
            user:{
              uid: chat.user.uid,
              gid: contact.gid,
              nickname: chat.user.nickname,
              message: chat.user.message,
              state : chat.user.state,
              date: 0
            }
          }, uid);
        });
        chatService.removeUserSession(chat.user.uid, $session.getId() );
        chat.user = null;
      }
    };

    var onMessage = function(msg : any) {
      msg = '' + msg;
      if (msg.length == 0) {
        return;
      }
      onMessageImpl(JSON.parse(msg) );
    };

    var onMessageImpl = function(data : any) {
      var action = (<any>actions)[data.action];
      if (action) {
        action(data);
      }
    };

    return {
      onOpen: onOpen,
      onClose: onClose,
      onMessage: onMessage
    }
  };

  export function createServer() {
    return new (Java.type('ws.IEndpoint'))(createChatEndpoint() );
  }
}
