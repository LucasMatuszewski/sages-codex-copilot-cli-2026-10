# Imported upstream code

The `jftp/` and `ftpapi/` directories are complete, byte-preserved source archives with no Git metadata. Original Eclipse settings, resources, POMs, Apache-2.0 licenses and NOTICE files are retained. Course code and build configuration live outside these directories.

| Component | Canonical source | Revision | Archive SHA-256 |
| --- | --- | --- | --- |
| jFTP | https://github.com/sai-pullabhotla/jftp | `14e62ceba4e371c2a0b955604b10f065f46f4f7d` | `3adefa006f85582f069409fb7060901dc34ff5a0bfdd333e72e2de810c059bb8` |
| FTP API 3.0.0 | https://github.com/sai-pullabhotla/ftpapi | `589f4b1b1f27f0f4a3a5bc4aece90ae419e88835` | `0f4282ed14531c9d5e5ad89457f7d56119b81ffd58f9fba7527d8fbc685538e1` |

jFTP's pinned commit is dated 2012-07-06. Its POM declares `5.0.2-SNAPSHOT`; the application's constants report `5.0.1`, build `20120623`. These are upstream values, not a course release. Its POM targets Java 5 with Maven Compiler Plugin 2.4, depends on FTP API 3.0.0 and JavaHelp 2.0.05, and names `com.myjavaworld.jftp.JFTPApplication` as its main class. Do not infer exact application age from these dates.

The FTP API 3.0.0 artifact returned HTTP 404 at Maven Central on 2026-10-05. The pinned source is the exact upstream `prepare release ftpapi-3.0.0` commit, not a newer API or a substitute implementation. `build-bridge/` builds it locally and uses JavaHelp 2.0.05 from Maven Central. It does not inherit old POM repository, deploy or release goals.

Copyright and license: jMethods, Inc., Apache License 2.0. See [jFTP license](jftp/LICENSE.txt), [jFTP notice](jftp/NOTICE.txt), [FTP API license](ftpapi/LICENSE.txt) and [FTP API notice](ftpapi/NOTICE.txt). Distribution must retain these notices. JavaHelp is a separately resolved runtime dependency, not copied source; its upstream POM identifies GPLv2 with Classpath exception (https://repo.maven.apache.org/maven2/javax/help/javahelp/2.0.05/javahelp-2.0.05.pom).

`upstream-sha256.json` records every imported file. Run `python3 scripts/verify-upstream.py` from the repository root to check the initial baseline. Workshop changes may deliberately alter that baseline; review and record them instead of rewriting this manifest to hide changes.

The course bridge excludes the preserved, unused `OSXAdapterOld.java`: it imports the obsolete Apple `ApplicationAdapter` API. No other upstream class references it. The active `JFTPApplication` uses the separate reflection-based `OSXAdapter`. This permits compilation on a non-Apple current JDK, without source rewrites. Modern macOS native menu/fullscreen integration has not been verified.
