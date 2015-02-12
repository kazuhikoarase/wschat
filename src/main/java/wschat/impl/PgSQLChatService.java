package wschat.impl;

import java.sql.ResultSet;

/**
 * PgSQLChatService
 * chat service for PostgreSQL
 * @author Kazuhiko Arase
 */
public class PgSQLChatService extends DefaultChatService {

    public PgSQLChatService() {
    }

    @Override
    protected String getNextValue(final String seq) throws Exception {
        final long[] value = new long[1];
        int count = executeQuery("select nextval('" + seq + "')",
                new Object[]{}, new ResultHandler() {
                    @Override
                    public void handle(ResultSet rs) throws Exception {
                        value[0] = rs.getLong(1);
                    }
                });
        if (count != 1) {
            throw new IllegalStateException();
        }
        return String.valueOf(value[0]);
    }
}
