package wschat;

import java.util.List;
import java.util.Map;

/**
 * IChatService
 * @author Kazuhiko Arase
 */
public interface IChatService {

    void putUserSession(String uid, String sid, String jsonData) throws Exception;
    String getUserSession(String uid, String sid) throws Exception;
    void removeUserSession(String uid, String sid) throws Exception;
    List<String> getUserSessionIdList(String uid) throws Exception;

    User getUser(String uid) throws Exception;
    void updateUser(User user) throws Exception;
    List<User> searchUsers(String uid, String keyword) throws Exception;

    String newGroup(List<GroupUser> users, String jsonData) throws Exception;
    Group getGroup(String uid, String gid) throws Exception;
    void updateGroup(String uid, Group group) throws Exception;
    List<Group> fetchGroups(String uid, Map<String,String> opts) throws Exception;

    String newMid() throws Exception;
    Message getMessage(String uid, String mid) throws Exception;
    void updateMessage(Message message) throws Exception;
    List<Message> fetchMessages(String uid, String gid, Map<String,String> opts) throws Exception;

    void updateAvatar(String uid, String data, int size) throws Exception;
    String getAvatar(String uid, int size) throws Exception;

}
