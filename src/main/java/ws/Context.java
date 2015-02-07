package ws;

import javax.websocket.Session;

/**
 * Context
 * @author Kazuhiko Arase
 */
public class Context {
    private final Session session;
    private final IServerEndpoint endpoint;
    public Context(
        final Session session,
        final IServerEndpoint endpoint
    ) {
        this.session = session;
        this.endpoint = endpoint;
    }
    public Session getSession() {
        return session;
    }
    public IServerEndpoint getEndpoint() {
        return endpoint;
    }
}
