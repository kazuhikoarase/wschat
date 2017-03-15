package wschat.impl;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.script.ScriptEngine;

import ws.util.ImageUtil;
import ws.util.ScriptUtil;
import wschat.Contact;
import wschat.Group;
import wschat.GroupUser;
import wschat.IChatService;
import wschat.Message;
import wschat.User;
import wschat.UserData;
import wschat.sql.ConnManager;

/**
 * DefaultChatService
 * default chat service for HSQLDB
 * @author Kazuhiko Arase
 */
public class DefaultChatService 
extends UserService implements IChatService {

  public DefaultChatService() {
  }

  protected String getNextValue(final String seq) throws Exception {
    final long[] value = new long[1];
    int count = executeQuery("select next value for " + seq + " from DUAL",
        new Object[]{}, new ResultHandler() {
          @Override
          public void handle(ResultSet rs) throws Exception {
            value[0] = rs.getLong(1);
          }
        });
    if (count != 1) {
      throw new IllegalStateException("count:" + count);
    }
    return String.valueOf(value[0]);
  }

  protected String getNextGid() throws Exception {
    return getNextValue("SEQ_GID");
  }

  protected String getNextMid() throws Exception {
    return getNextValue("SEQ_MID");
  }

  protected String getNextDataId() throws Exception {
    return getNextValue("SEQ_DATA_ID");
  }

  @Override
  public User getUser(String uid) throws Exception {
    final User user = new User();
    int count = executeQuery("select UID,JSON_DATA from USERS where UID=?",
        new Object[]{uid}, new ResultHandler() {
      @Override
      public void handle(ResultSet rs) throws Exception {
        user.setUid(rs.getString(1) );
        user.setJsonData(rs.getString(2) );
      }
    });
    if (count == 0) {
      return null;
    } else if (count != 1) {
      throw new IllegalStateException("count:" + count);
    }
    executeQuery("select CONTACT_UID,CONTACT_GID from CONTACTS where UID=?",
        new Object[]{uid}, new ResultHandler() {
      @Override
      public void handle(ResultSet rs) throws Exception {
        Contact contact = new Contact();
        contact.setUid(rs.getString(1) );
        contact.setGid(longToString(rs.getLong(2) ) );
        if (!contact.getUid().equals(user.getUid() ) ) {
          user.getContacts().add(contact);
        }
      }
    });
    return user;
  }

  @Override
  public void updateUser(User user) throws Exception {
    int count = executeQuery("select UID from USERS where UID=? for update",
        new Object[]{user.getUid()}, null);
    if (count == 0) {
      executeUpdate("insert into USERS (UID,JSON_DATA) values (?,?)",
          new Object[]{user.getUid(), user.getJsonData()});
    } else {
      executeUpdate("update USERS set JSON_DATA=? where UID=?",
          new Object[]{user.getJsonData(), user.getUid()});
    }
    executeUpdate("delete from CONTACTS where UID=?",
        new Object[]{user.getUid()});
    for (Contact contact : user.getContacts() ) {
      executeUpdate("insert into CONTACTS (UID,CONTACT_UID,CONTACT_GID) values (?,?,?)",
          new Object[]{user.getUid(), contact.getUid(),
          stringToLong(contact.getGid() )});
    }
    current().commit();
  }

  @Override
  public List<User> searchUsers(String uid, String keyword) throws Exception {
    final List<User> users = new ArrayList<User>();
    if (keyword.length() == 0) {
      return users;
    }
    final String lowerKeyword = keyword.toLowerCase();
    final ScriptEngine se = ScriptUtil.newScriptEngine();
    executeQuery("select UID,JSON_DATA from USERS order by UID",
      new Object[]{},
      new ResultHandler() {
        @Override
        public void handle(ResultSet rs) throws Exception {
          String uid = rs.getString(1).toLowerCase();
          String jsonData = rs.getString(2);
          se.put("jsonData", jsonData);
          String nickname = se.eval(
            "JSON.parse(jsonData).nickname || ''").
            toString().toLowerCase();
          if (uid.indexOf(lowerKeyword) != -1 ||
              nickname.indexOf(lowerKeyword) != -1) {
            User user = new User();
            user.setUid(uid);
            user.setJsonData(jsonData);
            users.add(user);
          }
        }
      });
    return users;
  }

  @Override
  public String getAvatar(String uid, int size) throws Exception {
    final String[] data = {""};
    int count = executeQuery("select DATA from AVATARS where UID=?",
        new Object[]{uid}, new ResultHandler() {
      @Override
      public void handle(ResultSet rs) throws Exception {
        data[0] = rs.getString(1);
      }
    });
    if (count == 0) {
      return "";
    } else if (count != 1) {
      throw new IllegalStateException("count:" + count);
    }
    return ImageUtil.resizeImage(data[0], size, false);
  }

  @Override
  public void updateAvatar(String uid, String data, int size) throws Exception {
    int count = executeQuery("select UID from AVATARS where UID=? for update",
        new Object[]{uid}, null);
    if (data.length() > 0) {
      data = ImageUtil.resizeImage(data, size, true);
    }
    if (count == 0) {
      executeUpdate("insert into AVATARS (UID,DATA) values (?,?)",
          new Object[]{uid, data});
    } else {
      if (data.length() == 0) {
        executeUpdate("delete from AVATARS where UID=?",
            new Object[]{uid});
      } else {
        executeUpdate("update AVATARS set DATA=? where UID=?",
            new Object[]{data, uid});
      }
    }
    current().commit();
  }

  @Override
  public String newGroup(List<GroupUser> users, String jsonData) throws Exception {

    final String gid = getNextGid();

    for (GroupUser user : users) {
      final String uid = user.getUid();
      final Group group = new Group();
      group.setGid(gid);
      group.getUsers().addAll(users);
      group.setJsonData(jsonData);
      updateGroup(uid, group);
    }

    current().commit();

    return gid;
  }

  @Override
  public Group getGroup(String uid, String gid) throws Exception {
    final Group group = new Group();
    group.setGid(gid);
    group.setMinDate(0L);
    group.setMaxDate(0L);
    int count = executeQuery("select JSON_DATA from GROUPS where UID=? and GID=?",
        new Object[]{uid, stringToLong(gid)}, new ResultHandler() {
      @Override
      public void handle(ResultSet rs) throws Exception {
        group.setJsonData(rs.getString(1) );
      }
    });
    if (count == 0) {
      return null;
    } else if (count != 1) {
      throw new IllegalStateException("count:" + count);
    }
    executeQuery("select GROUP_UID,JSON_DATA from GROUP_USERS where UID=? and GID=?",
        new Object[]{uid, stringToLong(gid)}, new ResultHandler() {
      @Override
      public void handle(ResultSet rs) throws Exception {
        GroupUser user = new GroupUser();
        user.setUid(rs.getString(1) );
        user.setJsonData(rs.getString(2) );
        group.getUsers().add(user);
      }
    });
    return group;
  }

  @Override
  public void updateGroup(String uid, Group group) throws Exception {

    int count = executeQuery("select UID from GROUPS where UID=? and GID=? for update",
        new Object[]{uid, stringToLong(group.getGid() ) }, null);
    if (count == 0) {
      executeUpdate("insert into GROUPS (UID,GID,JSON_DATA) values (?,?,?)",
          new Object[]{uid, stringToLong(group.getGid() ),
          group.getJsonData()} );
    } else {
      executeUpdate("update GROUPS set JSON_DATA=? where UID=? and GID=?",
          new Object[]{group.getJsonData(),
          uid, stringToLong(group.getGid() )} );
    }
    executeUpdate("delete from GROUP_USERS where UID=? and GID=?",
        new Object[]{uid, stringToLong(group.getGid() ) });
    for (GroupUser user : group.getUsers() ){
      executeUpdate("insert into GROUP_USERS (UID,GID,GROUP_UID,JSON_DATA) values (?,?,?,?)",
          new Object[]{uid, stringToLong(group.getGid() ),
          user.getUid(), user.getJsonData()});
    }
    current().commit();
  }

  @Override
  public List<Group> fetchGroups(final String uid,
      Map<String, String> opts) throws Exception {

    long date = getToday();
    if (opts.containsKey("lastDays") ) {
      int lastDays = Integer.parseInt( opts.get("lastDays") );
      if (lastDays >= 0) {
        date -= lastDays * DAY_IN_MILLIS;
      } else {
        date = 0;
      }
    }

    final List<Group> groups = new ArrayList<Group>();
    executeQuery("select GID,min(DATE),max(DATE) from MESSAGES where UID=? and DATE>=? group by GID",
        new Object[]{uid, date},
        new ResultHandler() {
          @Override
          public void handle(ResultSet rs) throws Exception {
            Group group = getGroup(uid,
                longToString(rs.getLong(1) ) );
            if (group == null) {
              // group dropped...
              return;
            }
            group.setMinDate(rs.getLong(2) );
            group.setMaxDate(rs.getLong(3) );
            groups.add(group);
          }
        });
    return groups;
  }

  @Override
  public String newMid() throws Exception {
    return getNextMid();
  }

  @Override
  public Message getMessage(String uid, String mid) throws Exception {
    final Message message = new Message();
    message.setUid(uid);
    message.setMid(mid);
    int count = executeQuery("select GID,DATE,JSON_DATA from MESSAGES where UID=? and MID=?",
        new Object[]{uid, stringToLong(mid)}, new ResultHandler() {
      @Override
      public void handle(ResultSet rs) throws Exception {
        message.setGid(longToString(rs.getLong(1) ) );
        message.setDate(rs.getLong(2) );
        message.setJsonData(rs.getString(3) );
      }
    });
    if (count == 0) {
      return null;
    } else if (count != 1) {
      throw new IllegalStateException("count:" + count);
    }
    return message;
  }

  @Override
  public void updateMessage(Message message) throws Exception {

    int count = executeQuery("select UID from MESSAGES where UID=? and MID=? for update",
        new Object[]{message.getUid(), 
          stringToLong(message.getMid() )}, null);
    if (count == 0) {
      executeUpdate("insert into MESSAGES (UID,MID,GID,DATE,JSON_DATA) values (?,?,?,?,?)",
          new Object[]{message.getUid(),
          stringToLong(message.getMid() ),
          stringToLong(message.getGid() ),
          message.getDate(), message.getJsonData()});
    } else {
      executeUpdate("update MESSAGES set JSON_DATA=? where UID=? and MID=?",
          new Object[]{message.getJsonData(),
          message.getUid(),
          stringToLong(message.getMid() )});
    }
    current().commit();
  }

  @Override
  public List<Message> fetchMessages(String uid, String gid, Map<String, String> opts) throws Exception {

    long date = getToday();
    if (opts.containsKey("lastDays") ) {
      int lastDays = Integer.parseInt( opts.get("lastDays") );
      if (lastDays >= 0) {
        date -= lastDays * DAY_IN_MILLIS;
      } else {
        date = 0;
      }
    } else {
      final SimpleDateFormat df = new SimpleDateFormat("yyyyMMdd");
      final long[] latestDate = new long[] { date };
      executeQuery("select count(GID),max(DATE) from MESSAGES" +
          " where UID=? and GID=?",
        new Object[]{uid, stringToLong(gid)},
        new ResultHandler() {
          @Override
          public void handle(ResultSet rs) throws Exception {
            if (rs.getLong(1) > 0) {
              latestDate[0] = df.parse(df.format(
                  new Date(rs.getLong(2) ) ) ).getTime();
            }
          }
        });
      date = latestDate[0];
    }

    final List<Message> messages = new ArrayList<Message>();
    executeQuery("select UID,MID,GID,DATE,JSON_DATA from MESSAGES" +
          " where UID=? and GID=? and DATE>=? order by DATE desc",
        new Object[]{uid, stringToLong(gid), date},
        new ResultHandler() {
          @Override
          public void handle(ResultSet rs) throws Exception {
            Message message = new Message();
            message.setUid(rs.getString(1) );
            message.setMid(longToString(rs.getLong(2) ) );
            message.setGid(longToString(rs.getLong(3) ) );
            message.setDate(rs.getLong(4) );
            message.setJsonData(rs.getString(5) );
            messages.add(message);
          }
        });
    return messages;
  }

  @Override
  public String newDataId() throws Exception {
    return getNextDataId();
  }

  @Override
  public UserData getUserData(String dataId) throws Exception {
    final UserData userData = new UserData();
    userData.setDataId(dataId);
    int count = executeQuery("select DATA_TYPE,UID,JSON_DATA from USER_DATA where DATA_ID=?",
        new Object[]{ stringToLong(dataId) }, new ResultHandler() {
      @Override
      public void handle(ResultSet rs) throws Exception {
        userData.setDataType(rs.getString(1) );
        userData.setUid(rs.getString(2) );
        userData.setJsonData(rs.getString(3) );
      }
    });
    if (count == 0) {
      return null;
    } else if (count != 1) {
      throw new IllegalStateException("count:" + count);
    }
    return userData;
  }

  @Override
  public void updateUserData(UserData userData, String date) throws Exception {
    final long time = date != null?
        new SimpleDateFormat("yyyyMMddHHmm").parse(date).getTime() : 0L;
    int count = executeQuery("select DATA_ID from USER_DATA where DATA_ID=? for update",
        new Object[]{ stringToLong(userData.getDataId() )}, null);
    if (count == 0) {
      executeUpdate("insert into USER_DATA (DATA_ID,DATA_TYPE,UID,DATE,JSON_DATA) values (?,?,?,?,?)",
          new Object[]{ stringToLong(userData.getDataId() ),
          userData.getDataType(), userData.getUid(),
          time, userData.getJsonData() });
    } else {
      executeUpdate("update USER_DATA set DATE=?, JSON_DATA=? where DATA_ID=?",
          new Object[]{ time, userData.getJsonData(),
          stringToLong(userData.getDataId() ) });
    }
    current().commit();
  }

  @Override
  public void deleteUserData(String dataId) throws Exception {
    executeUpdate("delete from USER_DATA where DATA_ID=?",
        new Object[]{ stringToLong(dataId) });
    current().commit();
  }

  @Override
  public List<UserData> fetchUserData(String uid) throws Exception {
    final List<UserData> userDataList = new ArrayList<UserData>();
    executeQuery("select DATA_ID,DATA_TYPE,UID,JSON_DATA from USER_DATA" +
          " where UID=? order by DATA_ID",
        new Object[]{ uid },
        new ResultHandler() {
          @Override
          public void handle(ResultSet rs) throws Exception {
            UserData userData = new UserData();
            userData.setDataId(longToString(rs.getLong(1) ) );
            userData.setDataType(rs.getString(2) );
            userData.setUid(rs.getString(3) );
            userData.setJsonData(rs.getString(4) );
            userDataList.add(userData);
          }
        });
    return userDataList;
  }

  protected static long stringToLong(String v) {
    if (v == null) {
      throw new NullPointerException();
    }
    return Long.valueOf(v);
  }

  protected static String longToString(long v) {
    return String.valueOf(v);
  }

  protected PreparedStatement prepareStatement(String sql, Object[] params) 
  throws Exception {
    PreparedStatement stmt = current().prepareStatement(sql);
    stmt.clearParameters();
    for (int i = 0; i < params.length; i += 1) {
      Object param = params[i];
      if (param == null) {
        throw new NullPointerException("param at " + (i + 1) );
      } else if (param instanceof String) {
        stmt.setString(i + 1, (String)param);
      } else if (param instanceof Long) {
        stmt.setLong(i + 1, (Long)param);
      } else {
        throw new Exception("unexpected type:" +
            param.getClass().getName() );
      }
    }
    return stmt;
  }

  protected int executeUpdate(String sql, Object[] params) 
  throws Exception {
    PreparedStatement stmt = prepareStatement(sql, params);
    try {
      return stmt.executeUpdate();
    } finally {
      stmt.close();
    }
  }

  protected int executeQuery(String sql, Object[] params, ResultHandler handler) 
  throws Exception {
    PreparedStatement stmt = prepareStatement(sql, params);
    try {
      ResultSet rs = stmt.executeQuery();
      try {
        int count = 0;
        while (rs.next() ) {
          count += 1;
          if (handler != null) {
            handler.handle(rs);
          }
        }
        return count;
      } finally {
         rs.close();
      }
    } finally {
      stmt.close();
    }
  }

  protected Connection current() {
    return ConnManager.getInstance().current();
  }

  protected long getToday() {
    Calendar cal = Calendar.getInstance();
    cal.set(Calendar.HOUR_OF_DAY, 0);
    cal.set(Calendar.MINUTE, 0);
    cal.set(Calendar.SECOND, 0);
    cal.set(Calendar.MILLISECOND, 0);
    return cal.getTimeInMillis();
  }

  protected static final long DAY_IN_MILLIS = 24 * 3600 * 1000L;

  protected interface ResultHandler {
    void handle(ResultSet rs) throws Exception;
  }
}
