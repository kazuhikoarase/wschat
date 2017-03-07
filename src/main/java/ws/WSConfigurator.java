package ws;

import javax.websocket.HandshakeResponse;
import javax.websocket.server.HandshakeRequest;
import javax.websocket.server.ServerEndpointConfig;

/**
 * WSConfigurator
 * @author Kazuhiko Arase
 */
public class WSConfigurator extends ServerEndpointConfig.Configurator {

  @Override
  public void modifyHandshake(
    ServerEndpointConfig config, 
    HandshakeRequest request, 
    HandshakeResponse response
  ) {
    config.getUserProperties().put("request", request);
  }
}
