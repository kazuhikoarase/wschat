package ws;

import javax.websocket.CloseReason;
import javax.websocket.EndpointConfig;

/**
 * IEndpoint
 * @author Kazuhiko Arase
 */
public interface IEndpoint {
    void onOpen(EndpointConfig config);
    void onClose(CloseReason closeReason);
    void onMessage(String message);
}
