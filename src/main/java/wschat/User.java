package wschat;

import java.util.ArrayList;
import java.util.List;

/**
 * User
 * @author Kazuhiko Arase
 */
public class User {
  private String uid;
  private String jsonData;
  private List<Contact> contacts = new ArrayList<Contact>();
  public String getUid() {
    return uid;
  }
  public void setUid(String uid) {
    this.uid = uid;
  }
  public String getJsonData() {
    return jsonData;
  }
  public void setJsonData(String jsonData) {
    this.jsonData = jsonData;
  }
  public List<Contact> getContacts() {
    return contacts;
  }
}
