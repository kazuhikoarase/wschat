package wschat.impl;

import java.sql.Connection;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.sql.DataSource;

/**
 * JDBCConnManager
 * @author Kazuhiko Arase
 */
public class JDBCConnManager {

    private static JDBCConnManager instance = null;

    public static JDBCConnManager getInstance() {
        if (instance == null) {
            instance = new JDBCConnManager();
        }
        return instance;
    }

    private final ThreadLocal<Connection> localConn = new ThreadLocal<Connection>();

    private final DataSource dataSource;

    private JDBCConnManager() {
        try {
            Context context = new InitialContext();
            dataSource = (DataSource)context.lookup("java:comp/env/jdbc/WSCHAT_DS");
        } catch(Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Connection getConnection() throws Exception {
        Connection conn = dataSource.getConnection();
        conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
        conn.setAutoCommit(false);
        return conn;
    }

    public Object tran(Task task) throws Exception {
        Connection conn = localConn.get();
        if (conn == null) {
            conn = getConnection();
            try {
                localConn.set(conn);
                try {
                    return task.invoke();
                } finally {
                    localConn.remove();
                }
            } finally {
                conn.rollback();
                conn.close();
            }
        } else {
            return task.invoke();
        }
    }

    public interface Task {
        Object invoke() throws Exception ;
    }

    public Connection current() {
        Connection conn = localConn.get();
        if (conn == null) {
            throw new NullPointerException("not in tran");
        }
        return conn;
    }
}
