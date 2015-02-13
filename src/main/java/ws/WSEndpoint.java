package ws;

import java.io.InputStreamReader;
import java.io.Reader;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.script.ScriptEngine;
import javax.servlet.ServletContext;
import javax.websocket.CloseReason;
import javax.websocket.Endpoint;
import javax.websocket.EndpointConfig;
import javax.websocket.MessageHandler;
import javax.websocket.Session;

import ws.util.ScriptUtil;

/**
 * WSEndpoint
 * @author Kazuhiko Arase
 */
public class WSEndpoint extends Endpoint {

    private static final ConcurrentHashMap<String,Object> global;
    protected static final Logger logger;

    static {
        global =  new ConcurrentHashMap<String,Object>();
        global.put("contextMap", new ConcurrentHashMap<String,Context>() );
        logger = Logger.getLogger(WSEndpoint.class.getName() );
    }

    public WSEndpoint() {
    }

    protected ConcurrentHashMap<String,Object> getGlobal() {
        return global;
    }

    @SuppressWarnings("unchecked")
    protected ConcurrentHashMap<String,Context> getContextMap() {
        return (ConcurrentHashMap<String,Context>)global.get("contextMap");
    }

    protected IServerEndpoint createEndpoint(
            Session session, EndpointConfig config) {
        try {
            ServletContext servletContext = (ServletContext)config.
                    getUserProperties().get("servletContext");
            String scriptPath = 
                    servletContext.getInitParameter("ws.scriptPath");
            ScriptEngine se = ScriptUtil.newScriptEngine();
            se.put(ScriptEngine.FILENAME, scriptPath);
            se.put("$global", global);
            se.put("$logger", logger);
            se.put("$session", session);
            se.put("$servletContext", servletContext);
            se.put("$request", config.getUserProperties().get("request") );
            se.put(ScriptEngine.FILENAME, scriptPath);
            Reader in = new InputStreamReader(
                servletContext.getResourceAsStream(scriptPath), "UTF-8");
            try {
                return (IServerEndpoint)se.eval(in);
            } finally {
                in.close();
            }
        } catch(RuntimeException e) {
            throw e;
        } catch(Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void onOpen(Session session, EndpointConfig config) {
        final Context context = new Context(session,
                createEndpoint(session, config) );
        session.addMessageHandler(new MessageHandler.Whole<String>() {
            @Override
            public void onMessage(String message) {
                context.getEndpoint().onMessage(message);
            }
        });
        getContextMap().put(session.getId(), context);
        context.getEndpoint().onOpen(config);
    }

    @Override
    public void onClose(Session session, CloseReason closeReason) {
        Context context = getContextMap().get(session.getId() );
        context.getEndpoint().onClose(closeReason);
        getContextMap().remove(session.getId() );
    }

    @Override
    public void onError(Session session, Throwable t) {
        logger.log(Level.SEVERE, t.getMessage(), t);
    }
}
