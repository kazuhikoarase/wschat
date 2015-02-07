package ws;

import java.util.logging.Logger;

import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.websocket.DeploymentException;
import javax.websocket.server.ServerContainer;
import javax.websocket.server.ServerEndpointConfig;

/**
 * WSServletContextListener
 * @author Kazuhiko Arase
 */
public class WSServletContextListener 
implements ServletContextListener {

    private final Logger logger = Logger.getLogger(getClass().getName() );

    @Override
    public void contextInitialized(ServletContextEvent event) {
        logger.info("contextInitialized");
        ServletContext servletContext = event.getServletContext();

        String path = servletContext.getInitParameter("ws.path");
        String scriptPath = servletContext.getInitParameter("ws.scriptPath");

        ServerContainer serverContainer = 
                (ServerContainer)servletContext.getAttribute(
                "javax.websocket.server.ServerContainer");

        try {
            ServerEndpointConfig config = ServerEndpointConfig.Builder.
                    create(WSEndpoint.class, path).
                    configurator(new WSConfigurator() ).
                    build();
            config.getUserProperties().put("servletContext", servletContext);
            config.getUserProperties().put("scriptPath", scriptPath);
            serverContainer.addEndpoint(config);
        } catch(DeploymentException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void contextDestroyed(ServletContextEvent event) {
        logger.info("contextDestroyed");
    }
}
