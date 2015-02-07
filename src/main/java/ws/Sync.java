package ws;

/**
 * Sync
 * @author Kazuhiko Arase
 */
public class Sync {
    public void sync(Object lock, ISync sync) {
        synchronized(lock) {
            sync.sync();
        }
    }
}