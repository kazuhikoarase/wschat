package wschat;

import java.util.ArrayList;
import java.util.List;

/**
 * Group
 * @author Kazuhiko Arase
 */
public class Group {
    private String gid;
    private long minDate;
    private long maxDate;
    private String jsonData;
    private List<GroupUser> users = new ArrayList<GroupUser>();
    public String getGid() {
        return gid;
    }
    public void setGid(String gid) {
        this.gid = gid;
    }
    public long getMinDate() {
        return minDate;
    }
    public void setMinDate(long minDate) {
        this.minDate = minDate;
    }
    public long getMaxDate() {
        return maxDate;
    }
    public void setMaxDate(long maxDate) {
        this.maxDate = maxDate;
    }
    public String getJsonData() {
        return jsonData;
    }
    public void setJsonData(String jsonData) {
        this.jsonData = jsonData;
    }
    public List<GroupUser> getUsers() {
        return users;
    }
}
