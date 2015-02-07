package wschat.impl;

import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.awt.image.ColorConvertOp;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.plugins.jpeg.JPEGImageWriteParam;
import javax.imageio.stream.ImageOutputStream;

import ws.util.Base64;
import wschat.IChatService;

/**
 * AbstractChatService
 * @author Kazuhiko Arase
 */
public abstract class AbstractChatService implements IChatService {

    private Map<String,Map<String,String>> sessionMap =
            new HashMap<String,Map<String,String>>();

    protected AbstractChatService() {
    }

    @Override
    public String getUserSession(String uid, String sid) {
        Map<String,String> sessions = sessionMap.get(uid);
        if (sessions == null) {
            return null;
        }
        return sessions.get(sid);
    }
    @Override
    public void putUserSession(String uid, String sid, String jsonData) {
        Map<String,String> sessions = sessionMap.get(uid);
        if (sessions == null) {
            sessions = new HashMap<String,String>();
            sessionMap.put(uid, sessions);
        }
        sessions.put(sid, jsonData);
    }
    @Override
    public void removeUserSession(String uid, String sid) {
        Map<String,String> sessions = sessionMap.get(uid);
        if (sessions == null) {
            return;
        }
        sessions.remove(sid);
    }
    @Override
    public List<String> getUserSessionIdList(String uid) {
        List<String> sidList = new ArrayList<String>();
        Map<String,String> sessions = sessionMap.get(uid);
        if (sessions != null) {
            sidList.addAll(sessions.keySet() );
        }        
        return sidList;
    }

    protected static String resizeImage(
        final String data,
        final double size,
        final boolean forceJpeg
    ) {
        try {
            int index = data.indexOf(',');
            if (index == -1) {
                return "";
            }
            byte[] buf = Base64.decode(
                    data.substring(index + 1).getBytes("ISO-8859-1") );
            BufferedImage image;
            InputStream in = new ByteArrayInputStream(buf);
            try {
                image = ImageIO.read(in);
            } finally {
                in.close();
            }
            double scale = 1.0;
            if (image.getWidth() > size || image.getHeight() > size) {
                scale = Math.min(
                    size / image.getWidth(),
                    size / image.getHeight() );
            } else {
                if (!forceJpeg) {
                    return data;
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try {
                writeJpegData(image, scale, 1.0f, out);
            } finally {
                out.close();
            }
            return "data:image/jpeg;base64," +
                new String(Base64.encode(out.toByteArray() ), "ISO-8859-1");
        } catch(Exception e) {
            e.printStackTrace();
            return "";
        }
    }

    protected static void writeJpegData(
        BufferedImage image,
        final double scale,
        final float quality,
        final OutputStream out
    ) throws IOException {

        if (scale != 1.0) {
            AffineTransformOp atop = new AffineTransformOp(
                new AffineTransform(scale, 0, 0, scale, 0, 0),
                    AffineTransformOp.TYPE_BILINEAR);
            image = atop.filter(image, null);
        }

        if (image.getType() != BufferedImage.TYPE_INT_RGB) {
            ColorConvertOp ccop = new ColorConvertOp(null);
            image = ccop.filter(image, new BufferedImage(
                    image.getWidth(), 
                    image.getHeight(),
                    BufferedImage.TYPE_INT_RGB) );
        }

        ImageWriteParam param = new JPEGImageWriteParam(null);
        param.setProgressiveMode(JPEGImageWriteParam.MODE_DISABLED);
        param.setCompressionMode(JPEGImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);

        ImageOutputStream imageOut = ImageIO.createImageOutputStream(out);
        
        ImageWriter writer = (ImageWriter)ImageIO.getImageWritersByFormatName("jpg").next();

        try {
            writer.setOutput(imageOut);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }
}
