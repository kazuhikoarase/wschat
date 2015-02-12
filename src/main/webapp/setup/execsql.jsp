<%@page import="wschat.sql.ConnManager"%>
<%@page contentType="text/html;charset=UTF-8" session="false" %>
<%@page import="java.io.InputStream" %>
<%@page import="java.io.FileInputStream" %>
<%@page import="java.io.BufferedInputStream" %>
<%@page import="java.io.ByteArrayOutputStream" %>
<%@page import="java.util.Date" %>
<%@page import="java.sql.Connection" %>
<%@page import="java.sql.Statement" %>
<%@page import="java.sql.ResultSet" %>
<%@page import="wschat.sql.ConnManager" %>

<%
response.setHeader("Cache-Control", "no-cache");
response.setHeader("Pragma", "no-cache");
response.setIntHeader("Expires", 0);

Connection conn = ConnManager.getInstance().getConnection();

try {

    String path = request.getServletPath();
	int index = path.lastIndexOf('/');
	if (index == -1) {
	    throw new Exception();
	}
    String[] sqls = readString((String)application.getRealPath(
            path.substring(0, index + 1) + request.getParameter("sql") ) ).
            split("\\s*;\\s*");
    %><table><%
    for (String sql : sqls) {
        if (sql.length() == 0) {
            continue;
        }
        Statement stmt = conn.createStatement();
        try {
            if (stmt.execute(sql) ) {
                ResultSet rs = stmt.getResultSet();
                try {
                    if (rs.next() ) {
                        Object value = rs.getObject(1);
                        if (value == null) {
                            value = "(null)";
                        } else {
                            value = value + "(" + value.getClass().getName() + ")";
                        }
                        %><tr>
                          <td><%= sql %></td>
                          <td><%= value %></td>
                          </tr><%
                    } else {
                        %><tr>
                          <td><%= sql %></td>
                          <td>N/A</td>
                          </tr><%
                    }
                } finally {
                    rs.close();
                }
            } else {
                %><tr>
                  <td><%= sql %></td>
                  <td><%= stmt.getUpdateCount() %></td>
                  </tr><%
            }
        } finally {
            stmt.close();
        }
    }
    %></table><%
    conn.commit();
} catch(Exception e) {
    e.printStackTrace();
} finally {
    conn.rollback();
    conn.close();
}

%>

<%= new Date() %> OK

<%!

protected String readString(String path) throws Exception {
    InputStream in = new  BufferedInputStream(new FileInputStream(
            path ) );
    try {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            byte[] buf = new byte[4096];
            int len;
            while ( (len = in.read(buf) ) != -1) {
                out.write(buf, 0, len);
            }
            return new String(out.toByteArray(), "UTF-8");
        } finally {
            out.close();
        }
        
    } finally {
        in.close();
    }
    
}

%>
