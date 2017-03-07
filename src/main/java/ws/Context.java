package ws;

import javax.websocket.Session;

/**
 * Context
 * @author Kazuhiko Arase
 */
public class Context {
  private final Session session;
  private final IEndpoint endpoint;
  public Context(
    final Session session,
    final IEndpoint endpoint
  ) {
    this.session = session;
    this.endpoint = endpoint;
  }
  public Session getSession() {
    return session;
  }
  public IEndpoint getEndpoint() {
    return endpoint;
  }
}
