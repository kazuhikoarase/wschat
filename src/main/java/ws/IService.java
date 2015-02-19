package ws;

import java.util.List;

/**
 * IService
 * @author Kazuhiko Arase
 */
public interface IService {
    void putUserSession(String uid, String sid,
            String jsonData) throws Exception;
    String getUserSession(String uid, String sid) throws Exception;
    void removeUserSession(String uid, String sid) throws Exception;
    List<String> getUserSessionIdList(String uid) throws Exception;
}
