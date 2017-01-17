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

In this case, the userId would be taken from http session.

Edit wschat-server-ext.ts.

```typescript
  service.doLogin = function(uid : string) {
    // TODO overwrite uid at here.
    uid = '' + $request.getHttpSession().getAttribute('userId');
    var user = service.getUser(uid);
    if (user == null) {
      // TODO dynamically create a user.
      service.newUser({
        uid: uid,
        nickname: uid
      });
      user = service.getUser(data.uid);
    }
    return user;
  };

  service.searchUsers = function(uid : string, keyword : string) {;
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
