package ws.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

/**
 * ScriptUtil
 * @author Kazuhiko Arase
 */
public class ScriptUtil {

  private ScriptUtil() {
  }

  public static ScriptEngine newScriptEngine() {
    ScriptEngineManager sem = new ScriptEngineManager();
    ScriptEngine se = sem.getEngineByName("javascript");
    try {
      eval(se, "Bridge.js");
      if (se.eval("this.JSON") == null) {
        // support for old Rhino
        eval(se, "JSON.js");
      }
    } catch(Exception e) {
      throw new RuntimeException(e);
    }
    return se;
  }

  private static Object eval(ScriptEngine se, String res)
  throws Exception {
    Reader in = new BufferedReader(new InputStreamReader(
      ScriptUtil.class.getResourceAsStream(res), "UTF-8") );
    try {
      return se.eval(in);
    } finally {
      in.close();
    }
  }

  public static Object eval(ScriptEngine se, Class<?> clazz, String suffix)
  throws ScriptException {
    try {
      String res = clazz.getSimpleName() + suffix;
      se.put(ScriptEngine.FILENAME, res);
      Reader in = new InputStreamReader(
          clazz.getResourceAsStream(res), "UTF-8");
      try {
        return se.eval(in);
      } finally {
        in.close();
      }
    } catch(IOException e) {
      throw new RuntimeException(e);
    }
  }
}
