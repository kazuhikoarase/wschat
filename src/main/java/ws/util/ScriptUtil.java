package ws.util;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.Reader;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;

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
            if (se.eval("this.JSON") == null) {
                // support for old Rhino
                Reader in = new BufferedReader(new InputStreamReader(
                    ScriptUtil.class.getResourceAsStream("JSON.js"),
                    "UTF-8") );
                try {
                    se.eval(in);
                } finally {
                    in.close();
                }
            }
        } catch(Exception e) {
            throw new RuntimeException(e);
        }
        return se;
    }
}
