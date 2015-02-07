package wschat;

import javax.servlet.ServletContext;

/**
 * IChatServiceFactory
 * @author Kazuhiko Arase
 */
public interface IChatServiceFactory {
    IChatService getInstance();
    class Builder {
        private Builder() {
        }
        public static IChatServiceFactory newFactory(
                ServletContext context) {
            try {
                Class<?> clazz = Class.forName(
                        context.getInitParameter("wschat.serviceFactory") );
                return (IChatServiceFactory)clazz.newInstance();
            } catch(RuntimeException e) {
                throw e;
            } catch(Exception e) {
                throw new RuntimeException(e);
            }
        }
    }
}
