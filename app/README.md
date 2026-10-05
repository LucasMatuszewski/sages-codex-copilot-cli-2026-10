# jFTP Java starter

Build and launch from the repository root with JDK 17 and Maven 3.9.x:

```bash
mvn -f app/pom.xml verify
```

```bash
java -jar app/launcher/target/jftp-workshop.jar
```

The Maven build, tests, packaging, packaged headless fallback and warm-cache offline build passed from a public Git checkout on native Windows and Ubuntu in [CI run 37265295119](https://github.com/LucasMatuszewski/sages-codex-copilot-cli-2026-10/actions/runs/37265295119). The direct Maven and Java commands are suitable for native PowerShell. Convenience entry points: `bash scripts/run-jftp.sh` or `./scripts/run-jftp.ps1` after packaging. If script execution is restricted by policy, use the direct Java command. The JAR must remain beside its generated `lib/` directory; it is not a fat JAR.

## Prerequisites and recovery

Check `java -version`, `javac -version` and `mvn -version` individually. Maven must report the intended JDK. Configure `JAVA_HOME` and PATH through your normal approved JDK/Maven setup if these commands are missing; reopen your terminal after installation. No JRE-only installation, global npm package, database, container, API key or WSL is required for the app.

The first build needs Maven Central for JavaHelp 2.0.05, JUnit and Maven plugins. Use your approved Maven proxy or mirror settings where required. Do not build the historical `jftp/pom.xml` directly: its Java 5 target and old repository/release configuration are intentionally preserved as evidence. Build the separate `app/pom.xml` reactor.

Once `verify` has succeeded, the same machine can run `mvn -o -f app/pom.xml verify` with its cached dependencies and plugins. A fresh machine without that cache is not an offline build environment.

A graphical desktop is needed for the Swing UI. In a headless environment the course launcher exits with code 2 and suggests headless tests. Continue repository analysis and tests with `mvn -f app/pom.xml test`; a trainer or participant with a desktop must verify the GUI. The original Swing window and local synthetic-file flow were verified on Linux/WSLg; native Windows GUI and modern macOS native integration remain unverified. The Windows CI evidence establishes build/package/headless behavior, not interactive GUI behavior.

## IDE use

The canonical build is the terminal reactor at `app/pom.xml`. You can use Eclipse or IntelliJ to read and edit the sources, then run the documented Maven command in a terminal. IDE Maven import has not been validated: the bridge uses source directories outside each module's basedir, so automatic m2e or IntelliJ source mapping is not an established workflow. Do not import the preserved upstream POM as if it were the course build. Use the verified terminal workflow if IDE import does not map the source trees correctly.

Surefire runs the supplied and future participant tests headlessly with `user.home` set to `app/launcher/target/test-home`. A test that initializes jFTP therefore keeps preferences under generated test output rather than the real user profile. This configuration does not change the application launcher or its separate workshop home.

## Boundaries

`jftp/` and `ftpapi/` are unchanged imported sources. [UPSTREAM.md](UPSTREAM.md) records revision, exact version discrepancies and Apache-2.0 attribution. `build-bridge/` compiles them using Java 8 API/bytecode compatibility on JDK 17. Only unused `OSXAdapterOld.java` is excluded from compilation, because its obsolete Apple API is absent in the current toolchain. Original files remain available for analysis.

`launcher/` is course infrastructure: original GUI, isolated preferences, automatic update checks disabled, two headless resource/classpath smoke tests. It performs no FTP transfer and supplies no modernization solution. `fixtures/local-files/` contains synthetic files for local browsing. `app/.workshop-home/` is generated and ignored; `-Dworkshop.home=<path>` selects another isolated home.

The original application UI and documentation retain upstream languages. The full exercise is [in the course library](../course-materials/java/README.md); open it only when asked. Participants add their own characterization tests under `launcher/src/test/java/` and write a separate PRD/ADR for their agreed change.
