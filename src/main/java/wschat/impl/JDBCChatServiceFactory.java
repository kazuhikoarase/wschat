package wschat.impl;

import wschat.IChatService;
import wschat.IChatServiceFactory;

/**
 * JDBCChatServiceFactory
 * @author Kazuhiko Arase
 */
public class JDBCChatServiceFactory implements IChatServiceFactory {

    private static IChatService instance;

    @Override
    public IChatService getInstance() {
        if (instance == null) {
            instance = new JDBCChatService().wrap();
        }
        return instance;
    }
}