package wschat.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import wschat.IUserService;

/**
 * UserService
 * @author Kazuhiko Arase
 */
public class UserService implements IUserService {

  private final Map<String,Map<String,String>> sessionMap =
      new HashMap<String,Map<String,String>>();

  public UserService() {
  }

  @Override
  public String getUserSession(String uid, String sid) {
    Map<String,String> sessions = sessionMap.get(uid);
    if (sessions == null) {
      return null;
    }
    return sessions.get(sid);
  }
  @Override
  public void putUserSession(String uid, String sid, String jsonData) {
    Map<String,String> sessions = sessionMap.get(uid);
    if (sessions == null) {
      sessions = new HashMap<String,String>();
      sessionMap.put(uid, sessions);
    }
    sessions.put(sid, jsonData);
  }
  @Override
  public void removeUserSession(String uid, String sid) {
    Map<String,String> sessions = sessionMap.get(uid);
    if (sessions == null) {
      return;
    }
    sessions.remove(sid);
  }
  @Override
  public List<String> getUserSessionIdList(String uid) {
    List<String> sidList = new ArrayList<String>();
    Map<String,String> sessions = sessionMap.get(uid);
    if (sessions != null) {
      sidList.addAll(sessions.keySet() );
    }    
    return sidList;
  }
}
