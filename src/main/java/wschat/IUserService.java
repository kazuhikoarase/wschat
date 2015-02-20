package wschat;

import java.util.List;

/**
 * IUserService
 * @author Kazuhiko Arase
 */
public interface IUserService {
    void putUserSession(String uid, String sid,
            String jsonData) throws Exception;
    String getUserSession(String uid, String sid) throws Exception;
    void removeUserSession(String uid, String sid) throws Exception;
    List<String> getUserSessionIdList(String uid) throws Exception;
}
