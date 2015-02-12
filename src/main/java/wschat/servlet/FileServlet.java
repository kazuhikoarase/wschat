package wschat.servlet;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.fileupload.DefaultFileItemFactory;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUpload;
import org.apache.commons.fileupload.FileUploadException;

import wschat.ChatServiceHolder;
import wschat.IChatService;
import wschat.Message;

/**
 * FileServlet
 * @author Kazuhiko Arase
 */
@SuppressWarnings("serial")
public class FileServlet extends HttpServlet {

    private IChatService service;
    private String doGetScript;
    private String doPostScript;

    protected final Logger log = Logger.getLogger(getClass().getName() );

    private long ticks;
    private long interval;
    private long tempFileExpireInMillis;
    private ExecutorService es;
    private boolean alive;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);

        service = ChatServiceHolder.getInstance(getServletContext() );

        doGetScript = buildDoGetScript();
        doPostScript = buildDoPostScript();
        
        ticks = getLongParam(config, "ticks", 1000L);
        interval =
                getLongParam(config, "interval", 1000L * 60 * 5);
        tempFileExpireInMillis =
                getLongParam(config, "tempFileExpireInMillis", 1000L * 3600);
        startup();
    }

    private long getLongParam(ServletConfig config, String name,
            long defaultValue) {
        String value = config.getInitParameter(name);
        return (value != null)? Long.valueOf(value) : defaultValue;
    }

    @Override
    public void destroy() {
        shutdown();
        super.destroy();
    }

    protected String buildDoGetScript() {
        StringBuilder script = new StringBuilder();
        script.append("var message = JSON.parse('' + javaMessage.getJsonData());");
        script.append("var name = message.file.name;");
        script.append("var tmpfile = message.file.tmpfile;");
        return script.toString();
    }

    protected String buildDoPostScript() {
        StringBuilder script = new StringBuilder();
        script.append("var result = {fileList:[]};");
        script.append("for (var i = 0; i < fileList.size(); i += 1) {");
        script.append("var item = fileList.get(i);");
        script.append("result.fileList.push({");
        script.append("name:''+item.get('name'),");
        script.append("contentType:''+item.get('contentType'),");
        script.append("tmpfile:''+item.get('tmpfile')");
        script.append("});");
        script.append("}");
        script.append("JSON.stringify(result);");
        return script.toString();
    }

    @Override
    protected void doGet(
        HttpServletRequest request,
        HttpServletResponse response
    ) throws ServletException, IOException {
        String uid = request.getParameter("uid");
        String mid = request.getParameter("mid");
        try {
            downloadFile(request, response, uid, mid);
        } catch(Exception e) {
            throw new ServletException(e);
        }
    }

    protected void downloadFile(
        HttpServletRequest request,
        HttpServletResponse response,
        String uid,
        String mid
    ) throws Exception {

        if (uid == null || mid == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        Message message = service.getMessage(uid, mid);

        ScriptEngineManager sem = new ScriptEngineManager();
        ScriptEngine se = sem.getEngineByName("javascript");

        se.put("javaMessage", message);
        se.eval(doGetScript);
        String name = se.get("name").toString();
        String tmpfile = se.get("tmpfile").toString();

        File file = new File(getRepository(), tmpfile);
        if (!file.exists() ) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        response.reset();
        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; " +
                encodeFilename(request, name) );

        OutputStream out = new BufferedOutputStream(
                response.getOutputStream() );
        try {
            InputStream in = new BufferedInputStream(
                    new FileInputStream(file) );
            try {
                byte[] buf = new byte[4096];
                int len;
                while ( (len = in.read(buf) ) != -1) {
                    out.write(buf, 0, len);
                }
            } finally {
                in.close();
            }
        } finally {
            out.close();
        }
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void doPost(
        HttpServletRequest request,
        HttpServletResponse response
    ) throws ServletException, IOException {

        DefaultFileItemFactory factory = new DefaultFileItemFactory();
        File repository = getRepository();
        factory.setRepository(repository);

        FileUpload upload = new FileUpload(factory);
        List<FileItem> items;

        try {
            items = (List<FileItem>)upload.parseRequest(request);
        } catch(FileUploadException e) {
            throw new ServletException(e);
        }

        List<Map<String,String>> fileList =
                new ArrayList<Map<String,String>>();
        for (FileItem item : items) {
            File tmpfile = writeToTmpfile(repository, item);
            Map<String,String> fileInfo = new HashMap<String, String>();
            fileInfo.put("name", new File(item.getName() ).getName() );
            fileInfo.put("contentType", item.getContentType() );
            fileInfo.put("tmpfile", tmpfile.getName() );
            fileList.add(fileInfo);
        }

        ScriptEngineManager sem = new ScriptEngineManager();
        ScriptEngine se = sem.getEngineByName("javascript");
        se.put("fileList", fileList);
        Object result;
        try {
            result = se.eval(doPostScript);
        } catch(ScriptException e) {
            throw new ServletException(e);
        }

        response.setContentType("application/json;charset=UTF-8");
        PrintWriter out = response.getWriter();
        try {
            out.print(result);
        } finally {
            out.close();
        }
    }

    protected File getRepository() {
        return (File)getServletContext().getAttribute(
                "javax.servlet.context.tempdir");
    }

    public static String encodeFilename(
        HttpServletRequest request, 
        String filename
    ) throws IOException {
        String ua = request.getHeader("User-Agent");
        if (ua != null && ua.contains("MSIE") ) {
            // * fixed to MS932
            // http://support.microsoft.com/default.aspx?scid=kb;ja;436616
            // ftp://ftp.rfc-editor.org/in-notes/rfc2231.txt
            return "filename=\"" +
                new String(filename.getBytes("MS932"), "ISO-8859-1") +
                "\"";
        }
        return "filename*=UTF-8''" + 
            URLEncoder.encode(filename, "UTF-8");
    }

    protected String getTempFilePrefix() {
        return "ws-fileupload";
    }

    protected String getTempFileSuffix() {
        return ".tmp";
    }

    protected File writeToTmpfile(
        File repository,
        FileItem item
    ) throws IOException {
        File tmpfile = File.createTempFile(
                getTempFilePrefix(),
                getTempFileSuffix(), repository);
        tmpfile.deleteOnExit();
        InputStream in = new BufferedInputStream(item.getInputStream() );
        try {
            OutputStream out = new BufferedOutputStream(
                new FileOutputStream(tmpfile) );
            try {
                byte[] buf = new byte[4096];
                int len;
                while ( (len = in.read(buf) ) != -1) {
                    out.write(buf, 0, len);
                }
            } finally {
                out.close();
            }
        } finally {
            in.close();
        }
        return tmpfile;
    }

    protected void startup() {
        alive = true;
        es = Executors.newSingleThreadExecutor();
        es.execute(new Runnable() {
            @Override
            public void run() {
                task();
            }
        });
        log.info("cleanup service startup");
    }

    protected void task() {
        long lastTime = System.currentTimeMillis();
        while (alive) {
            try {
                long time = System.currentTimeMillis();
                if (time - lastTime > interval) {
                    cleanup();
                    lastTime = time;
                }
                Thread.sleep(ticks);
            } catch(InterruptedException e) {
                throw new RuntimeException(e);
            }
        }
    }

    protected void cleanup() {
        for (File file : getRepository().listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File dir, String name) {
                return name.startsWith(getTempFilePrefix() ) &&
                        name.endsWith(getTempFileSuffix() );
            }
        }) ) {
            if (System.currentTimeMillis() - file.lastModified() >
                    tempFileExpireInMillis) {
                log.info("expired: " + file.getName() );
                file.delete();
            }
        }
    }

    protected void shutdown() {
        try {
            alive = false;
            es.shutdown();
            es.awaitTermination(Long.MAX_VALUE, TimeUnit.NANOSECONDS);
        } catch(InterruptedException e) {
            throw new RuntimeException(e);
        }
        log.info("cleanup service shutdown");
    }
}
