# Course preparation boundaries

The real jFTP Swing client and its FTP API dependency remain in `app/jftp/` and `app/ftpapi/`, preserving every imported byte. `app/UPSTREAM.md` records canonical repository URLs, exact revisions, licenses, upstream version values and the historical dependency-resolution issue. `app/upstream-sha256.json` describes the initial baseline.

The separate Maven reactor `app/pom.xml` compiles FTP API first, jFTP second and the workshop launcher last. Module source directories point to the original source trees. jFTP resources include all upstream English, German and Traditional Chinese bundles, images and JavaHelp files. JavaHelp 2.0.05 is resolved from Maven Central. No legacy POM is inherited, so historical FTP deployment, release tagging and HTTP repositories are not activated.

The modern Compiler Plugin uses release 8 while the checked QA runtime is JDK 17. This is a build compatibility bridge, not a source modernization. It excludes the unused `OSXAdapterOld.java`, whose obsolete Apple ApplicationAdapter API is absent on the current JDK. The original file is retained, and the active reflection-based OSXAdapter remains unchanged.

The workshop launcher sets an isolated user home before initializing jFTP, changes the existing automatic-update preference to false and launches the original JFTPApplication on the Swing event dispatch thread. This deliberate course configuration is distinct from original defaults, which use the real user home and enable update checks. It does not connect to an FTP server. Users must keep FTP sessions disconnected for the local exercise.

The supplied JUnit tests verify resource packaging and runtime dependency loading without initializing an application or networking. They are infrastructure smoke checks. Participants choose and implement their own characterization tests, then define desired changes in their own PRD and ADR. No exercise answer, production refactoring or new project architecture is supplied here.

Build documentation: [Maven lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html), [Compiler release setting](https://maven.apache.org/plugins/maven-compiler-plugin/examples/set-compiler-release.html). Source lookup was checked with Context7 on 2026-10-05. Runtime QA and platform limitations are recorded separately by the trainer; compilation alone is not evidence of manual GUI or real FTP behavior.
