# wschat

Copyright (c) 2015 Kazuhiko Arase

URL: http://www.d-project.com/

Licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php


### System Requirements

Modern browser

Apache Tomcat 7

HSQLDB + Apache Ant or PostgreSQL

### Embedding in your webapp

Edit chat-server.js.

```javascript
  actions.login = function(data) {
    // TODO overwrite uid at here.
    data.uid = '' + $request.getHttpSession().getAttribute('userId');
    chat.user = chatService.getUser(data.uid);
    if (chat.user == null) {
      chatService.newUser({
        uid: data.uid,
        nickname: data.uid
      });
      chat.user = chatService.getUser(data.uid);
    }
```

Create a servlet extends FileServlet and modify web.xml with your servlet.

```java
public class MyFileServlet extends wschat.servlet.FileServlet {
    @Override
    protected void downloadFile(
        HttpServletRequest request,
        HttpServletResponse response,
        String uid,
        String mid
    ) throws Exception {
        // TODO overwrite uid at here.
        uid = request.getSession().getAttribute("userId");
        super.downloadFile(request, response, uid, mid);
    }
}
```
