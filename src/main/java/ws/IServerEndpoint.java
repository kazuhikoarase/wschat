package ws;

import javax.websocket.CloseReason;
import javax.websocket.EndpointConfig;

/**
 * IServerEndpoint
 * @author Kazuhiko Arase
 */
public interface IServerEndpoint {
    void onOpen(EndpointConfig config);
    void onClose(CloseReason closeReason);
    void onMessage(String message);
}
