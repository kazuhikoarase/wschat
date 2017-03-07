package wschat;

/**
 * Message
 * @author Kazuhiko Arase
 */
public class Message {
  private String uid;
  private String gid;
  private String mid;
  private long date;
  private String jsonData;
  public String getUid() {
    return uid;
  }
  public void setUid(String uid) {
    this.uid = uid;
  }
  public String getGid() {
    return gid;
  }
  public void setGid(String gid) {
    this.gid = gid;
  }
  public String getMid() {
    return mid;
  }
  public void setMid(String mid) {
    this.mid = mid;
  }
  public long getDate() {
    return date;
  }
  public void setDate(long date) {
    this.date = date;
  }
  public String getJsonData() {
    return jsonData;
  }
  public void setJsonData(String jsonData) {
    this.jsonData = jsonData;
  }
}
