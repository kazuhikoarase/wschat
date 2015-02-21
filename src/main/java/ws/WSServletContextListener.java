package ws;

import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.websocket.DeploymentException;
import javax.websocket.server.ServerContainer;
import javax.websocket.server.ServerEndpointConfig;

import ws.util.ScriptUtil;

/**
 * WSServletContextListener
 * @author Kazuhiko Arase
 */
public class WSServletContextListener 
implements ServletContextListener {

    private final Logger logger = Logger.getLogger(getClass().getName() );

    @SuppressWarnings("unchecked")
    @Override
    public void contextInitialized(ServletContextEvent event) {
        logger.info("contextInitialized");
        ServletContext servletContext = event.getServletContext();

        ServerContainer serverContainer = 
                (ServerContainer)servletContext.getAttribute(
                "javax.websocket.server.ServerContainer");

        ScriptEngine se = ScriptUtil.newScriptEngine();
        try {
            se.put("config", servletContext.getInitParameter("ws.config") );
            ScriptUtil.eval(se, WSServletContextListener.class, "_parse.js");
        } catch(ScriptException e) {
            throw new RuntimeException(e);
        }

        List<Map<String, String>> endpoints =
                (List<Map<String, String>>)se.get("endpoints");

        for (Map<String, String> ep : endpoints) {
            try {
                String path = ep.get("path");
                String scriptPath = ep.get("scriptPath");
                logger.info("register endpoint " + path + " - " + scriptPath);
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
    }

    @Override
    public void contextDestroyed(ServletContextEvent event) {
        logger.info("contextDestroyed");
    }
}
