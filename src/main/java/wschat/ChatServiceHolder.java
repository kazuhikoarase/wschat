package wschat;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

import javax.servlet.ServletContext;

import wschat.sql.ConnManager;

/**
 * ChatServiceHolder
 * @author Kazuhiko Arase
 */
public class ChatServiceHolder {

  private ChatServiceHolder() {
  }

  private static final Object LOCK = new Object();

  private static IChatService instance = null;

  public static IChatService getInstance(ServletContext sc) {
    synchronized(LOCK) {
      if (instance == null) {
        try {
          Class<?> clazz = Class.forName(
              sc.getInitParameter("wschat.service") );
          instance = wrap(
              (IChatService)clazz.newInstance() );
        } catch(RuntimeException e) {
          throw e;
        } catch(Exception e) {
          throw new RuntimeException(e);
        }
      }
      return instance;
    }
  }

  protected static IChatService wrap(IChatService service) {
    return (IChatService)Proxy.newProxyInstance(
        IChatService.class.getClassLoader(),
      new Class[]{IChatService.class}, new TranProxy(service) );
  }

  protected static class TranProxy implements InvocationHandler {
    private IChatService target;
    public TranProxy(IChatService target) {
      this.target = target;
    }
    @Override
    public Object invoke(Object proxy,
        final Method method, final Object[] args)
        throws Throwable {
      return ConnManager.getInstance().
          tran(new ConnManager.Task() {
        @Override
        public Object invoke() throws Exception {
          return method.invoke(target, args);
        }
      });
    }
  }
}
