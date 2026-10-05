# jFTP Java starter

Build and launch from the repository root with JDK 17 and Maven 3.9.x:

```bash
mvn -f app/pom.xml verify
```

```bash
java -jar app/launcher/target/jftp-workshop.jar
```

The same commands work in native Windows PowerShell. Convenience entry points: `bash scripts/run-jftp.sh` or `./scripts/run-jftp.ps1` after packaging. If script execution is restricted by policy, use the direct Java command. The JAR must remain beside its generated `lib/` directory; it is not a fat JAR.

## Prerequisites and recovery

Check `java -version`, `javac -version` and `mvn -version` individually. Maven must report the intended JDK. Configure `JAVA_HOME` and PATH through your normal approved JDK/Maven setup if these commands are missing; reopen your terminal after installation. No JRE-only installation, global npm package, database, container, API key or WSL is required for the app.

The first build needs Maven Central for JavaHelp 2.0.05, JUnit and Maven plugins. Use your approved Maven proxy or mirror settings where required. Do not build the historical `jftp/pom.xml` directly: its Java 5 target and old repository/release configuration are intentionally preserved as evidence. Build the separate `app/pom.xml` reactor.

Once `verify` has succeeded, the same machine can run `mvn -o -f app/pom.xml verify` with its cached dependencies and plugins. A fresh machine without that cache is not an offline build environment.

A graphical desktop is needed for the Swing UI. In a headless environment the course launcher exits with code 2 and suggests headless tests. Continue repository analysis and tests with `mvn -f app/pom.xml test`; a trainer or participant with a desktop must verify the GUI. Modern macOS native integration and native Windows execution are not established by Linux QA.

## Boundaries

`jftp/` and `ftpapi/` are unchanged imported sources. [UPSTREAM.md](UPSTREAM.md) records revision, exact version discrepancies and Apache-2.0 attribution. `build-bridge/` compiles them using Java 8 API/bytecode compatibility on JDK 17. Only unused `OSXAdapterOld.java` is excluded from compilation, because its obsolete Apple API is absent in the current toolchain. Original files remain available for analysis.

`launcher/` is course infrastructure: original GUI, isolated preferences, automatic update checks disabled, two headless resource/classpath smoke tests. It performs no FTP transfer and supplies no modernization solution. `fixtures/local-files/` contains synthetic files for local browsing. `app/.workshop-home/` is generated and ignored; `-Dworkshop.home=<path>` selects another isolated home.

The original application UI and documentation retain upstream languages. The full exercise is [in the course library](../course-materials/java/README.md); open it only when asked. Participants add their own characterization tests under `launcher/src/test/java/` and write a separate PRD/ADR for their agreed change.
