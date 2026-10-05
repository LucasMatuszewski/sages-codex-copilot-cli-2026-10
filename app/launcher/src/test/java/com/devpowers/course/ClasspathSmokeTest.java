package com.devpowers.course;

import java.util.Locale;
import java.util.ResourceBundle;
import org.junit.Test;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertFalse;

/** Infrastructure checks only. Participants add characterization tests separately. */
public class ClasspathSmokeTest {
    @Test
    public void applicationResourcesAreOnClasspath() {
        ResourceBundle resources = ResourceBundle.getBundle("com.myjavaworld.jftp.JFTP", Locale.ENGLISH);
        assertFalse(resources.getString("text.notConnected").isEmpty());
        assertNotNull(getClass().getResource("/com/myjavaworld/jftp/jftp16.gif"));
        assertNotNull(getClass().getResource("/helpset/helpSet.xml"));
    }

    @Test
    public void requiredRuntimeDependenciesCanLoadWithoutInitializingAnApplication() throws Exception {
        ClassLoader loader = getClass().getClassLoader();
        assertNotNull(Class.forName("com.myjavaworld.jftp.JFTPApplication", false, loader));
        assertNotNull(Class.forName("com.myjavaworld.ftp.DefaultFTPClient", false, loader));
        assertNotNull(Class.forName("javax.help.HelpSet", false, loader));
    }
}
