package com.devpowers.course;

import com.myjavaworld.jftp.JFTP;
import com.myjavaworld.jftp.JFTPApplication;
import java.awt.GraphicsEnvironment;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import javax.swing.SwingUtilities;

/** Course launch configuration. The upstream application remains unchanged. */
public final class WorkshopLauncher {
    private WorkshopLauncher() { }

    public static void main(String[] args) throws Exception {
        if (GraphicsEnvironment.isHeadless()) {
            System.err.println("A graphical desktop is required for jFTP. Use mvn -f app/pom.xml test for offline verification.");
            System.exit(2);
        }
        Path home = Paths.get(System.getProperty("workshop.home", "app/.workshop-home")).toAbsolutePath();
        Files.createDirectories(home);
        System.setProperty("user.home", home.toString());
        JFTP.prefs.setCheckForUpdates(false);
        JFTP.savePreferences(JFTP.prefs);
        System.out.println("Workshop application home: " + home);
        System.out.println("Automatic update checks disabled. Use local synthetic files; leave FTP disconnected.");
        SwingUtilities.invokeLater(() -> new JFTPApplication());
    }
}
