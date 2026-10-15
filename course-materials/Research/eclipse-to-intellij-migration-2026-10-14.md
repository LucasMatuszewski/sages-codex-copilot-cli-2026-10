# Eclipse-only Java projects in IntelliJ: diagnosis, migration and demo (research 14.10.2026)

A Sages/Sygnity group-2 participant's project works only in Eclipse and failed to adapt to IntelliJ. This note explains why that happens, gives a repeatable agent-driven migration workflow, and specifies the synthetic demo project used in the course (C:\course\eclipse-demo, prepared 14.10.2026). Research verified against JetBrains and Eclipse documentation; UNCONFIRMED marks what needs a live rehearsal. The demo is console-based so startup evidence is easy on corporate laptops.
Research date: 2026-10-14 UTC. Audience: Sages/Sygnity group 2, 15-16 October 2026. This is a trainer report and a synthetic demo specification, not a migration of the participant's application. All recommendations and demo choices below are proposed workflow, rather than measured results.

Evidence: JetBrains' fetched help identifies IntelliJ IDEA 2026.2; Eclipse's release announcement identifies Eclipse/Equinox 4.41, 2026-09. Record the actual installed IDE build and enabled plugins before rehearsal. Eclipse links below use the moving `latest` documentation; access to the corresponding dated help URL failed, so exact 2026-09 behavior beyond the release announcement is UNCONFIRMED. [JetBrains import documentation](https://www.jetbrains.com/help/idea/import-project-from-eclipse-page-1.html), [Eclipse 4.41 GA announcement](https://www.eclipse.org/lists/jdt-dev/msg02969.html).

Verification boundary: no Windows IDE, Java compilation, Maven execution or live demo was run for this report. The participant's root cause, exact importer handling of each exotic container, and Windows demo outcomes are UNCONFIRMED. `gh api` was blocked with `Network access to "api.github.com" was blocked: domain is not on the allowlist for the current sandbox mode.` A public raw importer-source fetch also failed. Context7 resolved `/jetbrains/intellij-community`, but returned general dependency infrastructure rather than the Eclipse importer; no importer implementation claim relies on those results. No community advice is used as verified evidence.

## Part A: why "works in Eclipse" can fail elsewhere

The working build may be the combination of repository files, Eclipse plugins, workspace preferences, external directories and a particular JDK. A checkout does not necessarily contain all of those inputs. Diagnose import, compilation, packaging and startup separately: successful indexing proves none of the latter three.

The current documented route is File > Open, or File > New > Project from Existing Sources > Import project from external model > Eclipse. The wizard can import a workspace, maps each Eclipse project to a module, requests an SDK, and may request user libraries. Therefore variables, libraries and linked sources are not automatically evidence of unsupported import. Plain Java is the intended straightforward case; where m2e has a valid POM, import that POM instead. "Handles m2e well" means ordinary Maven configuration, not execution of every Eclipse configurator. [JetBrains import wizard](https://www.jetbrains.com/help/idea/import-project-from-eclipse-page-1.html).

| Cause | What Eclipse supplies | What IntelliJ/build tooling needs | Repository detection and follow-up |
| --- | --- | --- | --- |
| Natures and custom builders | `.project` identifies project natures and an ordered builder list; installed plugins implement them. | An equivalent build step or compatible plugin, not merely a copied identifier. | Parse `natures/nature`, `buildSpec/buildCommand/name` and builder arguments; identify generated outputs and builder order. Unknown IDs are blockers, not disposable metadata. [Eclipse project format](https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.isv/reference/misc/project_description_file.html). |
| WTP facets and deployment | Facets describe Java EE capabilities; configured server runtimes can contribute APIs. | Explicit packaging, deployment layout, compatible server/API versions, and any required licensed IDE features. | Inspect `.settings/org.eclipse.wst.common.project.facet.core.xml`, `.settings/org.eclipse.wst.common.component`, `WebContent`, `WEB-INF` and runtime containers; inspect workspace server definitions with the owner's scoped export. [WTP facets](https://help.eclipse.org/latest/topic/org.eclipse.jst.j2ee.doc.user/topics/cfacets.html), [WTP runtimes](https://help.eclipse.org/latest/topic/org.eclipse.wst.server.ui.doc.user/topics/twinstprf.html). |
| PDE/OSGi and Target Platform | PDE computes compile and launch dependencies from the selected target, which may default to the host Eclipse installation. | Bundle resolution, manifests, p2/target inputs and an OSGi launch model; an ordinary Java module is insufficient. | Look for `org.eclipse.pde.PluginNature`, PDE builders/containers, `.target`, `plugin.xml`, `feature.xml`, `.product`, `build.properties`, and `META-INF/MANIFEST.MF`. The selected target can still be workspace-only. [PDE target platform](https://help.eclipse.org/latest/topic/org.eclipse.pde.doc.user/concepts/target.htm?cp=4_1_5). |
| Relative `kind="lib"` entries | JDT resolves a project/workspace path to a JAR or class directory. | The same physical bytes, scope and path interpretation. | For `lib/foo.jar`, resolve relative to the owning project; distinguish workspace-root `/OtherProject/lib/foo.jar` from filesystem paths. Check existence, hashes, duplicate classes and filename case. Do not treat every leading slash as a Unix absolute path. [JDT build path](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.user/reference/ref-properties-build-path.htm). |
| `kind="var"`, including `M2_REPO` | A workspace classpath variable expands the first path segment. | A corresponding path variable or an explicit dependency declaration. | List variable names and request their definitions; `M2_REPO` does not itself prove that a POM exists. Resolve suffixes against the defined root and report missing JARs. [JDT variables](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.user/concepts/concept-classpath-variables.htm). |
| User libraries | A named library groups ordered JARs, defined in workspace preferences. | Definitions and files, or replacement Maven coordinates. | Detect `org.eclipse.jdt.USER_LIBRARY/NAME`; ask for the library export. A common preference location is `<workspace>\.metadata\.plugins\org.eclipse.core.runtime\.settings\org.eclipse.jdt.core.prefs`; confirm it on that workspace. Never assume the name contains its membership. [Eclipse user libraries](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.user/reference/preferences/java/buildpath/ref-preferences-user-libraries.htm). |
| Classpath containers: IvyDE/custom | A plugin expands `kind="con"` into entries, potentially from Ivy or company-specific configuration. | Its resolved dependency set plus reproducible resolution rules. | Inventory container IDs, `ivy.xml`, `ivysettings.xml`, plugin versions and exported classpaths. Do not convert a container ID into a fictitious artifact. Exact IntelliJ support for each custom container is UNCONFIRMED until tested. [Apache IvyDE container](https://ant.apache.org/ivy/ivyde/history/latest-milestone/cp_container.html). |
| Linked resources and variable-linked sources | `.project` links workspace-visible names to external paths or URIs, possibly using resource path variables. | A resolved source/resource location inside the content model, or a portable replacement. | Parse `linkedResources/link` with `name`, `type`, `location`/`locationURI`, and `variableList` if present; request workspace variable definitions. Resource path variables and JDT classpath variables are different namespaces. Check both. [Eclipse linked-path variables](https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.user/concepts/cpathvars.htm). |
| Source folders versus modules | Source entries define package roots, filters, output locations and test flags. | Correct source/resource/test roots within modules. | Preserve inclusions/exclusions, per-source outputs and test attributes; do not turn every source folder into a Maven module. Resources under JDT source roots may be copied to output, unlike Java files under an unmapped Maven directory. [JDT source configuration](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.user/reference/ref-properties-build-path.htm). |
| Multiple workspace projects | Required projects and exported dependencies participate in compilation. | All relevant modules and an explicit dependency graph. | Parse `kind="src" path="/ProjectName"`, `.project` references, exported flags and access rules; resolve names via `.project`, not folder names alone. Report missing projects and cycles. IDE modules here are not necessarily JPMS modules. [JDT project dependencies](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.user/reference/ref-properties-build-path.htm). |
| JDK compliance versus SDK | JDT preferences and the JRE container select language/bytecode constraints and libraries; the IDE itself may use another JVM. | Project/module SDK, language level, Maven runner JDK and appropriate release/toolchain settings. | Inspect `.settings/org.eclipse.jdt.core.prefs`, JRE container IDs and launch JREs. Record source/compliance/target separately and check `java -version`, `javac -version`, `mvn -version`. Never infer application Java from the IDE's bundled runtime. [JetBrains compilation model](https://www.jetbrains.com/help/idea/migrating-from-eclipse-to-intellij-idea.html), [Maven release option](https://maven.apache.org/plugins-archives/maven-compiler-plugin-3.14.1/examples/set-compiler-release.html). |
| APT factory path | JDT APT selects processor JARs/plugins, options and generated-source directories separately from the ordinary classpath. | Explicit compatible annotation processors and generation phases. | Inspect `.factorypath`, `.settings/org.eclipse.jdt.apt.core.prefs`, generated folders and processor versions; distinguish plugin processors from JAR processors. A compile dependency alone is not a processor configuration. [JDT APT](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.isv/guide/jdt_apt_getting_started.htm), [factory-path API](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.isv/reference/api/org/eclipse/jdt/apt/core/util/IFactoryPath.html). |
| Encoding and inherited workspace settings | Project settings can inherit workspace defaults, including text encoding. | Explicit encoding and equivalent compiler/resource settings. | Inspect `.settings/org.eclipse.core.resources.prefs` and scoped workspace preference exports; absence of a project override means unknown, not UTF-8. Distinguish Java source encoding from resource decoding by the application. [Eclipse workspace preferences](https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.user/reference/ref-9.htm). |
| No Maven/Gradle or other external build | Eclipse files and builders may be the effective build specification. | Either a complete IDE module model or a build executable outside the IDE. | Search for POMs, Gradle settings/builds, Ant files and scripts before declaring the project IDE-only. If none exist, dependency and generation discovery comes before POM generation. This is a common diagnostic scenario, not a measured claim about this participant. |
| Swing/Windows launch configuration | Launch settings select main class, working directory, VM/program arguments, environment and native library paths. | Equivalent launch settings and matching native architecture where relevant. | Inspect shared `.launch`, batch/PowerShell launchers, DLL/JNI/SWT dependencies and scoped workspace launch exports. Swing itself is portable; Windows paths/native integrations may not be. A `.launch` is not automatically an IntelliJ run configuration. [JDT launching](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.user/tasks/task-launching_java_program.htm), [JetBrains launch migration advice](https://www.jetbrains.com/help/idea/migrating-from-eclipse-to-intellij-idea.html). |
| ECJ, problem severity and access rules | Eclipse uses ECJ and JDT-specific diagnostics; it can sometimes launch despite compilation errors. | A clean reproducible compile and intentionally retained policy. | Compare JDT problem severities, `.classpath` access rules and ECJ/javac diagnostics. JDT problems set to `error` are not identical to javac `-Werror`; do not silently weaken policy. IDEA can select Eclipse compiler, but this does not reproduce missing builders or Maven runner configuration. [JetBrains compiler differences](https://www.jetbrains.com/help/idea/migrating-from-eclipse-to-intellij-idea.html), [JDT compiler options](https://help.eclipse.org/latest/topic/org.eclipse.jdt.doc.isv/reference/api/org/eclipse/jdt/core/JavaCore.html). |

2026.x PDE caution: JetBrains says OSGi support is not bundled, the old OSGi plugin is no longer supported, and its last compatible IDEA version is 2025.3. A third-party "Eclipse PDE Partial" listing exists; its exact 2026.2 compatibility and coverage are UNCONFIRMED and must not be presented as full PDE parity. Retaining Eclipse/PDE for editing and adopting Tycho for CI can be the right outcome. [JetBrains OSGi status](https://www.jetbrains.com/help/idea/osgi.html), [third-party plugin listing](https://plugins.jetbrains.com/plugin/16761-eclipse-pde-partial), [Tycho target-platform guidance](https://tycho.eclipseprojects.io/doc/main/TargetPlatform.html).

m2e caution: lifecycle mappings can ignore, execute or delegate Maven plugin executions to Eclipse configurators. Thus a working Eclipse build and a working Maven CLI build are separate evidence. Inspect generated sources and mappings before importing the POM into IDEA. [m2e execution/lifecycle documentation](https://eclipse.dev/m2e/documentation/m2e-execution-not-covered.html).

Dla trenera: Pokaż, że działający projekt to repozytorium plus ustawienia workspace i pluginy, a import nie odtwarza automatycznie całego procesu budowania.

## Part B: repeatable agent-driven migration

Run these examples in Windows PowerShell from the actual application checkout, not the course-material repository. Use an existing wrapper (`.\mvnw.cmd`) when available; the synthetic demo initially has none, so commands use installed `mvn`. Corporate repositories, proxy and approved JDK setup are prerequisites; never print Maven settings or credentials. Use synthetic sources only in public AI tooling. Retain default approval prompts; use one agent at a time.

CLI entry: `codex "PROMPT"` starts an interactive session with an initial prompt; `copilot` starts an interactive session where the same prompt can be pasted. The latter is preferable to unattended mutation in this demo. `copilot -p "PROMPT"` is also documented, but tool approvals must be configured deliberately. Check installed help rather than importing bypass flags. [Official OpenAI command reference](https://developers.openai.com/codex/cli/reference/), [GitHub interactive/programmatic modes](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-cli).

### 1. Inventory and capture the Eclipse baseline

Read `.project`, `.classpath`, `.settings`, `.factorypath`, launch descriptors and any existing build. Request only selected user-library/variable/launch exports; do not crawl the whole `.metadata` tree. Preserve raw entries, origin file/line, resolved path, existence, JAR SHA-1/SHA-256, candidate coordinates, export/test/access flags, source/resource filters, generated output and unknowns. Expand known containers using evidence; leave unknown ones unresolved. Explicitly report missing variables, source links, JARs and projects.

```powershell
rg --files --hidden -g .project -g .classpath -g .factorypath -g '*.prefs' -g '*.target' -g '*.launch' -g pom.xml -g build.xml -g build.gradle -g build.gradle.kts -g settings.gradle -g settings.gradle.kts -g ivy.xml -g ivysettings.xml -g '!.git/**' -g '!.metadata/**'
```
Minimal inventory shape, with the demo's expected entries (paths and existence remain UNCONFIRMED until run):

```json
{"project":"LegacyDesk","entries":[
  {"kind":"lib","raw":"lib/commons-lang3-3.17.0.jar","resolved":"C:\\course\\eclipse-demo\\LegacyDesk\\lib\\commons-lang3-3.17.0.jar","exists":null},
  {"kind":"var","raw":"WORKSHOP_LIB/commons-codec-1.17.1.jar","variable":"WORKSHOP_LIB","exists":null},
  {"kind":"src","raw":"linked-src","linkVariable":"DEMO_SHARED","exists":null}
],"unknowns":["workspace variable definitions","actual JDK and encoding"],"evidence":[]}
```
Codex prompt (or paste its quoted body into Copilot):

```powershell
codex "Read AGENTS.md and the Eclipse configuration. Do not change source or build files. Parse every project, nature, builder, classpath entry, source filter, link, processor path and launch setting. Write docs/migration-inventory.json and docs/migration-inventory.md with file/line evidence, resolved paths, hashes, project dependency graph, missing inputs and UNCONFIRMED items. Request only the necessary workspace preference exports. Establish a clean Eclipse build and record the real application's baseline with synthetic inputs. Stop at unresolved build-critical inputs."
```
Baseline gate: perform Eclipse Project > Clean, inspect Problems and builder output, and run the real affected flow; old `bin` files or "continue despite errors" do not establish a baseline. Before production/configuration restructuring, add behavior characterization checks compatible with the discovered project, get them green against the original layout, and demonstrate a controlled assertion-detecting mutation followed by restoration. Record compiler, test and startup commands separately. If no clean baseline is possible, report repair scope before migration.

### 2. Choose the target and document the scope

Recommend Maven when the team wants reproducible Java builds and CI; preserve the existing layout initially on a large project. Gradle is reasonable if already standardized. IntelliJ-native `.iml` modules are a last resort when build conversion is out of scope: they can restore IDE productivity but retain IDE dependence. PDE may require Tycho and continued Eclipse usage. A parent aggregator normally has `packaging=pom`; module dependencies come from actual inter-project compile dependencies, not folder proximity. Resolve cycles explicitly before generating a reactor.

```powershell
codex "Use the inventory to propose Maven, Gradle, IntelliJ-native modules or Eclipse plus Tycho. Recommend one route and state unresolved blockers. Record the agreed scope and observable acceptance criteria in docs/PRD.md, and the build decision with alternatives in docs/ADR/ADR-001-build-migration.md. Preserve application behavior, dependency versions and Java level. Do not implement until the trainer confirms the recorded decision."
```
Acceptance criteria: clean CLI compile; discovered tests execute with recorded counts; equivalent resources and generated classes; the real flow matches Eclipse output/errors; Maven import produces the expected modules; a fresh checkout builds without workspace variables or unrecorded local installs. Do not include a JDK/framework upgrade in this migration implicitly.

### 3. Resolve dependencies from physical evidence

Inspect JAR manifests and embedded `META-INF/maven/*/*/pom.properties`/POMs locally. Calculate SHA-1 for exact-artifact lookup and SHA-256 for the inventory; filenames are hints only. Query Central by SHA-1, collect all candidate coordinates/classifiers, and verify a candidate against the original bytes. Zero results means unresolved, not permission to guess or upgrade; multiple matches require disambiguation. A shaded/repacked/vendor-patched JAR may need its own identity. The endpoint is documented; live API availability and demo JAR bytes are UNCONFIRMED. [Sonatype REST API](https://central.sonatype.org/search/rest-api-guide/).

```powershell
$jarSha1 = (Get-FileHash -Algorithm SHA1 '.\lib\commons-lang3-3.17.0.jar').Hash.ToLowerInvariant(); $lookupQuery = [uri]::EscapeDataString('1:"' + $jarSha1 + '"'); (Invoke-RestMethod -Uri ('https://search.maven.org/solrsearch/select?q=' + $lookupQuery + '&rows=20&wt=json')).response.docs | Select-Object g,a,v,p,ec
```
For unresolved JARs, prefer a documented local bootstrap using an explicitly assigned internal coordinate, with an embedded/vendor POM where available. It does not make CI portable: the team must later supply an authorized repository or reproducible bootstrap to each runner. Add an explicit `TODO: replace local bootstrap with approved repository; owner and acceptance condition` in the migration report. A `system` dependency with `<systemPath>${project.basedir}/lib/vendor.jar</systemPath>` is a temporary last resort; it bypasses normal repository resolution and does not provide a normal transitive model. [Maven local install](https://maven.apache.org/guides/mini/guide-3rd-party-jars-local.html), [Maven dependency scopes](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html).

```powershell
mvn install:install-file '-Dfile=C:\course\eclipse-demo\LegacyDesk\lib\vendor.jar' '-DgroupId=local.migration' '-DartifactId=vendor' '-Dversion=1.0-migration' '-Dpackaging=jar'
```
```powershell
codex "Resolve each inventoried JAR using embedded metadata and exact checksum evidence; query only public artifact hashes, never upload JARs or proprietary source. Record coordinate candidates and confidence. Preserve original versions and classpath order evidence. Report duplicate versions and duplicate classes before choosing dependencyManagement or exclusions. For unresolved JARs document a local install/bootstrap or temporary system scope with an explicit TODO and portability limitation. Do not fabricate Maven coordinates."
```
Duplicate-version gate: Eclipse's ordered flat classpath and Maven's mediated dependency graph can select different classes. Record baseline winners, then intentionally pin/exclude after characterization; do not silently retain the newest. Follow with an explicit dependency tree. [Maven dependency mediation](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html).

### 4. Generate the build with an explicit mapping

Map each Eclipse project to an appropriate artifact, keeping multiple source roots inside a module where justified. Translate source/test folders, exclusions, resource copy/filter behavior, encoding and release settings; preserve native runtime requirements and launch working directories. Standard Maven directories are useful for the tiny demo; large projects can use `sourceDirectory`, `testSourceDirectory`, resources and a pinned additional-source plugin without moving thousands of files. Make servlet/container APIs `provided` only when runtime evidence supports it. Configure APT processor paths/options explicitly; do not rely on accidental discovery, especially on newer JDKs. [Maven compiler processor and encoding options](https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html).

```powershell
codex "Implement the confirmed build migration from docs/PRD.md and ADR-001. Generate a root aggregator and child POMs only where the observed dependency graph requires them. Map all source/test/resource roots, filters, generated output, Java release, encoding and annotation processors. Pin compatible plugin and dependency versions. Preserve application logic and Eclipse usability. For this synthetic demo only, use the exact target layout in the trainer report. Show every Eclipse-to-Maven mapping and unresolved builder before compiling."
```
### 5. Verify in small rounds, then import into IntelliJ

```powershell
mvn -q compile
```
```powershell
mvn test
```
```powershell
mvn dependency:tree
```
```powershell
codex "Run compile, then tests; record exact commands, exit codes and discovered/executed/skipped test counts. If quiet compilation fails, rerun without -q once to diagnose. Fix one cause at a time from inventory evidence, then rerun affected checks. Never disable processors, delete dependencies or weaken assertions to get green. For reactor work use the relevant -pl module -am slice, then the full reactor. Run integration tests in their actual phase; when Failsafe is configured this normally requires verify. Finally clean-build and manually run the real synthetic flow before claiming success."
```
Zero tests is not a test pass. A local install or a previous `target` directory can conceal missing inputs; finish with `mvn clean verify` and an independently provisioned checkout/runner using the documented bootstrap. For the demo, perform the exact manual CLI commands in Part C and compare full output and exit status. Compilation, tests, packaging and startup each need their own evidence.

Only after CLI gates pass: File > Open > `pom.xml`, choose Maven, verify the project SDK and Maven runner JDK, and compare IDEA modules/dependencies/source/test/resource roots with Eclipse Project Explorer. Run the same entry point and tests in IDEA and Eclipse. Capture screenshots of module roots, dependency resolution and the successful IDE run; do not infer success from the import dialog disappearing.

### 6. Keep irreducibly IDE-specific work explicit

```powershell
codex "Write the handover: identify builders or visual editors that still require Eclipse, reproducible code generation replacements, PDE/Tycho target-platform work, and WTP server/API/deployment mapping. Separate verified outcomes from manual work and UNCONFIRMED items. Include Windows launch arguments, native DLL architecture and resource/persistence checks when present. Do not mark migration complete until the required runtime and fresh-environment checks pass."
```
Manual decisions: whether a custom/visual builder is replaceable, whether generated artifacts are authoritative, how PDE/p2 dependencies are reproduced, and which server supplies WTP APIs. Retain Eclipse where its tooling is essential; a Tycho CI build does not imply IntelliJ has PDE launch/editing parity. Server integration support must be checked against the installed IDEA version/license and approved server runtime.

Copy-ready `AGENTS.md` addition for the migration checkout, subordinate to its existing instructions:

```markdown
## Eclipse build migration
Read docs/PRD.md, docs/ADR/ADR-001-build-migration.md and docs/migration-inventory.md first.
Use evidence from .project, .classpath, .settings, .factorypath and scoped workspace exports.
Never crawl .metadata, credentials, participant data or unrelated external linked directories.
Keep unknown builders, containers, variables and missing artifacts explicit; do not guess.
Preserve behavior, Java level, dependency versions, classpath semantics and resource encoding.
Get characterization checks green on the original layout before production restructuring.
Record the chosen build mapping before implementation and obtain the trainer's confirmation.
Prefer the existing wrapper; report compile, discovered tests and real startup separately.
Do not weaken tests or drop code generation to make a build pass.
Import Maven into IntelliJ only after CLI verification; compare modules and run the real flow.
Use local synthetic fixtures; no external FTP, production credentials or proprietary uploads.
Completion needs runtime evidence and a fresh-environment build without hidden workspace state.
```
Dla trenera: Prowadź agenta przez inwentaryzację, uzgodniony build i małe rundy weryfikacji; zielony import oraz zero uruchomionych testów nie są sukcesem.

## Part C: synthetic Windows demo and skill proposal

### C1. Eclipse-only console application

Design: three production classes, two public JAR dependencies in `lib`, one workspace classpath variable and one linked source folder using a different workspace resource-path variable. No initial POM/Gradle build. Console output makes startup evidence easier on corporate laptops than a new GUI. Requires an approved JDK 17, Eclipse 2026-09, IDEA 2026.x, Maven 3.9.x and access to approved artifact repositories. These are demo choices, not requirements imposed on the participant's application. Dependency versions below are pinned teaching fixtures, not latest-version/security recommendations; their downloads and bytes remain UNCONFIRMED until rehearsal.

Exact initial filesystem tree; `linked-src` is an Eclipse virtual link and must not be created as a physical directory:

```text
C:\course\eclipse-demo\
  LegacyDesk\
    .project
    .classpath
    .settings\org.eclipse.jdt.core.prefs
    .settings\org.eclipse.core.resources.prefs
    lib\commons-lang3-3.17.0.jar
    lib\commons-codec-1.17.1.jar
    src\demo\App.java
    src\demo\MessageFormatter.java
    src\demo\messages.properties
  shared-src\demo\BuildInfo.java
```
Create directories with Windows Explorer or an editor. Save every text file below as UTF-8 (without BOM). Binary JAR contents are the exact downloaded artifacts, not generated Java classes; these commands specify their origin and destination. Obtain them through the company's approved mirror if direct Central is blocked, record SHA-256/SHA-1, and confirm coordinates against hashes before rehearsal. No actual download was performed here.

```powershell
Invoke-WebRequest 'https://repo.maven.apache.org/maven2/org/apache/commons/commons-lang3/3.17.0/commons-lang3-3.17.0.jar' -OutFile 'C:\course\eclipse-demo\LegacyDesk\lib\commons-lang3-3.17.0.jar'
```
```powershell
Invoke-WebRequest 'https://repo.maven.apache.org/maven2/commons-codec/commons-codec/1.17.1/commons-codec-1.17.1.jar' -OutFile 'C:\course\eclipse-demo\LegacyDesk\lib\commons-codec-1.17.1.jar'
```
Full `LegacyDesk\.project`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<projectDescription>
  <name>LegacyDesk</name><comment>Synthetic Eclipse migration demo</comment><projects/>
  <buildSpec><buildCommand><name>org.eclipse.jdt.core.javabuilder</name><arguments/></buildCommand></buildSpec>
  <natures><nature>org.eclipse.jdt.core.javanature</nature></natures>
  <linkedResources><link><name>linked-src</name><type>2</type><locationURI>DEMO_SHARED</locationURI></link></linkedResources>
</projectDescription>
```
Full `LegacyDesk\.classpath`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<classpath>
  <classpathentry kind="src" path="src"/>
  <classpathentry kind="src" path="linked-src"/>
  <classpathentry kind="con" path="org.eclipse.jdt.launching.JRE_CONTAINER/org.eclipse.jdt.internal.debug.ui.launcher.StandardVMType/JavaSE-17"/>
  <classpathentry kind="lib" path="lib/commons-lang3-3.17.0.jar"/>
  <classpathentry kind="var" path="WORKSHOP_LIB/commons-codec-1.17.1.jar"/>
  <classpathentry kind="output" path="bin"/>
</classpath>
```
Full `LegacyDesk\.settings\org.eclipse.jdt.core.prefs`:

```properties
eclipse.preferences.version=1
org.eclipse.jdt.core.compiler.codegen.targetPlatform=17
org.eclipse.jdt.core.compiler.compliance=17
org.eclipse.jdt.core.compiler.source=17
```
Full `LegacyDesk\.settings\org.eclipse.core.resources.prefs`:

```properties
eclipse.preferences.version=1
encoding/<project>=UTF-8
```
Full `LegacyDesk\src\demo\App.java`:

```java
package demo;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
public final class App {
    public static void main(String[] args) throws Exception {
        Properties messages = new Properties();
        try (InputStream stream = App.class.getResourceAsStream("/demo/messages.properties")) {
            if (stream == null) throw new IllegalStateException("Missing /demo/messages.properties");
            messages.load(new InputStreamReader(stream, StandardCharsets.UTF_8));
        }
        String input = args.length == 0 ? "  demo  " : args[0];
        System.out.println(messages.getProperty("welcome") + " | " + MessageFormatter.format(input) + " | " + BuildInfo.VERSION);
    }
}
```
Full `LegacyDesk\src\demo\MessageFormatter.java`; API choices are supported by Apache's Javadocs, but the exact pinned-JAR compile is UNCONFIRMED. [StringUtils.trimToEmpty](https://commons.apache.org/proper/commons-lang/apidocs/org/apache/commons/lang3/StringUtils.html#trimToEmpty(java.lang.String)), [DigestUtils.sha256Hex](https://commons.apache.org/proper/commons-codec/apidocs/org/apache/commons/codec/digest/DigestUtils.html#sha256Hex(java.lang.String)).

```java
package demo;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.codec.digest.DigestUtils;
public final class MessageFormatter {
    private MessageFormatter() {}
    public static String format(String input) {
        String normalized = StringUtils.trimToEmpty(input);
        return normalized + ":" + DigestUtils.sha256Hex(normalized).substring(0, 8);
    }
}
```
Full `LegacyDesk\src\demo\messages.properties`:

```properties
welcome=Zażółć gęślą jaźń
```
Full `shared-src\demo\BuildInfo.java`:

```java
package demo;
public final class BuildInfo {
    public static final String VERSION = "eclipse-demo-1";
    private BuildInfo() {}
}
```
Eclipse setup: choose workspace `C:\course\eclipse-demo\workspace`; import `LegacyDesk` through Existing Projects into Workspace without copying it. Preferences > Java > Installed JREs: register JDK 17 and associate the JavaSE-17 execution environment. Preferences > Java > Build Path > Classpath Variables: set `WORKSHOP_LIB` to `C:\course\eclipse-demo\LegacyDesk\lib`. Preferences > General > Workspace > Linked Resources: define `DEMO_SHARED` as `C:\course\eclipse-demo\shared-src`. Refresh, Project > Clean, inspect Problems, and run `demo.App` as Java Application. Expected default output is `Zażółć gęślą jaźń | demo:2a97516c | eclipse-demo-1`, exit 0; this outcome is UNCONFIRMED until rehearsal.

Failure/degradation demonstration: open/import only `C:\course\eclipse-demo\LegacyDesk` in an IDEA environment without the two variables or workspace export. Show any missing-variable prompt, unresolved codec import, unresolved `BuildInfo`, or absent linked source root. An importer may successfully resolve both when given the missing definitions; that is a valid outcome. Do not claim linked resources or variables are categorically unsupported. Record the exact installed build, wizard choices and observed symptoms; the predicted behavior is UNCONFIRMED. If full import succeeds, demonstrate that the checkout still has no standalone build and depends on outside state, rather than manufacturing a compiler failure.

Pre-migration characterization: first add the test below as `LegacyDesk\tests\demo\MessageFormatterTest.java`, mark `tests` as an Eclipse source folder containing tests, and add Eclipse's JUnit 4 library through Java Build Path > Add Library. Run it with Run As > JUnit Test: expect 3 tests. Temporarily replace the formatter's normalization with `input == null ? "" : input`, confirm the trimming assertions fail, then restore the original production code and rerun green. Also manually run App with default, blank and Polish input to characterize resource/link/output behavior. No such checks have been executed for this report.

Full characterization test (after migration its path is `LegacyDesk\src\test\java\demo\MessageFormatterTest.java`):

```java
package demo;
import org.junit.Test;
import static org.junit.Assert.assertEquals;
public class MessageFormatterTest {
    @Test public void trimsAndHashes() { assertEquals("demo:2a97516c", MessageFormatter.format("  demo  ")); }
    @Test public void emptyIsStable() { assertEquals(":e3b0c442", MessageFormatter.format("   ")); }
    @Test public void nullIsEmpty() { assertEquals(":e3b0c442", MessageFormatter.format(null)); }
}
```
Demo migration prompt, paste into either interactive CLI: "Read the trainer report and inventory. Record and confirm the Maven decision before changing files. Get the characterization checks green against the original Eclipse layout. Then move App.java and MessageFormatter.java to src/main/java/demo; copy the synthetic linked BuildInfo.java there, preserving its bytes and documenting the new canonical owner; move messages.properties to src/main/resources/demo and the characterization test to src/test/java/demo. Add the exact POM below. Update Eclipse .classpath to the three new roots, both original lib JAR paths, the existing JavaSE-17 JRE container, JUnit 4 container and bin output; remove the linkedResources element from .project. Keep the external original and lib artifacts until parity is verified, but compile each class once. Do not alter application logic. Compile, execute tests, clean-verify, run the real commands and compare Eclipse/IntelliJ behavior."

Exact resulting Java/resource contents are unchanged above. Full new `LegacyDesk\pom.xml`; plugin versions are reproducible fixtures rather than claims about the latest releases. Compiler release configuration and the Surefire version are documented. [Compiler 3.14.1](https://maven.apache.org/plugins-archives/maven-compiler-plugin-3.14.1/examples/set-compiler-release.html), [Surefire 3.5.4](https://maven.apache.org/surefire-archives/surefire-3.5.4/maven-surefire-plugin/plugin-info.html).

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>training.migration</groupId><artifactId>legacy-desk</artifactId><version>1.0-SNAPSHOT</version>
  <properties><maven.compiler.release>17</maven.compiler.release><project.build.sourceEncoding>UTF-8</project.build.sourceEncoding></properties>
  <dependencies>
    <dependency><groupId>org.apache.commons</groupId><artifactId>commons-lang3</artifactId><version>3.17.0</version></dependency>
    <dependency><groupId>commons-codec</groupId><artifactId>commons-codec</artifactId><version>1.17.1</version></dependency>
    <dependency><groupId>junit</groupId><artifactId>junit</artifactId><version>4.13.2</version><scope>test</scope></dependency>
  </dependencies>
  <build><plugins>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-compiler-plugin</artifactId><version>3.14.1</version></plugin>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-surefire-plugin</artifactId><version>3.5.4</version><configuration><failIfNoTests>true</failIfNoTests></configuration></plugin>
  </plugins></build>
</project>
```
Run Part B's compile and test commands from `LegacyDesk`, then `mvn clean verify`. Manual CLI QA on Windows, after a successful clean build, can deliberately use the same pinned `lib` bytes to compare pre/post migration (dependency hashes must match Maven artifacts). Do not call this the Maven-only/fresh-checkout gate:

```powershell
java -cp 'target\classes;lib\commons-lang3-3.17.0.jar;lib\commons-codec-1.17.1.jar' demo.App
```
```powershell
java -cp 'target\classes;lib\commons-lang3-3.17.0.jar;lib\commons-codec-1.17.1.jar' demo.App '   '
```
```powershell
java -cp 'target\classes;lib\commons-lang3-3.17.0.jar;lib\commons-codec-1.17.1.jar' demo.App '  Witaj  '
```

Expect respectively the default output above; `Zażółć gęślą jaźń | :e3b0c442 | eclipse-demo-1`; and `Zażółć gęślą jaźń | Witaj:<hash>` (hash of the trimmed input). Rehearsed on 15.10.2026 with Temurin 17.0.20: runs 1 and 2 matched exactly, UTF-8 resources display correctly when the console is UTF-8. A non-ASCII command-line argument is mangled before `main` on Windows: Java decodes argv with `sun.jnu.encoding` (the ANSI code page, here Cp1250), so keep demo arguments ASCII and demonstrate Polish text through the UTF-8 properties file instead. That limitation is itself a teaching point about platform encoding assumptions. The three digest prefixes were independently checked with Python 3 `hashlib` on UTF-8 input for this report; application output is still UNCONFIRMED. Record `$LASTEXITCODE` immediately after each run. For the error path, temporarily rename only `target\classes\demo\messages.properties`, run App, verify a nonzero exit and `Missing /demo/messages.properties`, restore it and rerun clean-verify. Inspect exception output; this app writes no persistent state and uses no service.

Fresh-environment/IDE gate: import `pom.xml` as Maven in IDEA with no Eclipse variables, run all 3 tests and App, and capture screenshots/results. Provision a separate fresh checkout on the Windows machine with only the migrated source/resource/test files and POM, no `lib` or shared-source folder. From that checkout run the following commands, using a previously nonexistent local-repository directory; an approved mirror may still be configured. These checks establish independence from Eclipse variables and accidental cached local installs; outcomes remain UNCONFIRMED here.

```powershell
mvn '-Dmaven.repo.local=C:\course\eclipse-demo\fresh-m2' clean verify
```

```powershell
java -cp 'target\classes;C:\course\eclipse-demo\fresh-m2\org\apache\commons\commons-lang3\3.17.0\commons-lang3-3.17.0.jar;C:\course\eclipse-demo\fresh-m2\commons-codec\commons-codec\1.17.1\commons-codec-1.17.1.jar' demo.App
```

At 5,000 files: inventory first, do not paste the entire repository into a prompt or move all files to standard directories. Group projects by the actual dependency graph, identify shared generators/resources/launches and cycles, preserve layouts, migrate one leaf module with its callers, run scoped `-pl ... -am` checks, then full-reactor/runtime gates. Keep file/line evidence and a short unresolved-input report for the trainer; module boundaries need human confirmation.

### C2. Proposed public skill for EdukeyTeam/agent-toolbox

Name: `eclipse-to-intellij`. One-line description: "Inventory Eclipse-only Java build inputs and migrate them to a verified portable build for IntelliJ, preserving behavior and exposing unsupported IDE dependencies." Public toolbox is appropriate because the workflow and fixtures contain no company-specific confidential context. This is a proposal only: no skill files, installation or fleet rollout are performed.

`SKILL.md` outline: frontmatter and precise triggers; required intake (checkout, IDE/JDK/plugin versions, build baseline, authorized exports); evidence/data boundaries; decision gate; workflow table below; compiler/test/runtime/fresh-environment completion criteria; focused references for containers, PDE/WTP and Windows launch mapping. Non-goals: JDK/framework upgrades, blind XML conversion, replacing every PDE feature, and claiming success from import alone.

| Stage | Deterministic helper | Agent/human responsibility | Evidence/gate |
| --- | --- | --- | --- |
| Inventory | `scripts/eclipse_inventory.py`: safe XML/properties parser, project-name graph, variables, links, scopes, existence and hashes -> versioned inventory JSON. | Supply selected workspace exports; explain unknown containers/builders and choose scan scope. | Origin file/line, normalized/raw paths, unresolved list; no source mutation. |
| Coordinates | `scripts/resolve_jar_coordinates.py`: embedded POM metadata plus optional SHA-1 lookup; bounded timeout/rate limit and cached response. | Disambiguate candidates, patched/shaded JARs, scopes and duplicate versions; approve unresolved-artifact bootstrap. | Hash match or explicit unresolved status; never guessed coordinates. |
| Build draft | `scripts/generate_pom_stub.py`: declared project graph and approved mapping -> POM stubs with pinned inputs and explicit unresolved placeholders. | Choose modules, generation phases, resource behavior, compiler, APT, Tycho/Gradle/native-module route. | Draft generation refuses cycles, missing mappings and overwriting existing builds; XML validity alone is not build validity. |
| Verification | Optional command runner records commands, exits, test counts and local artifact provenance. | Diagnose failures from originals, preserve policy, manually exercise real UI/CLI/API and compare IDE models. | Characterization baseline, clean compile, executed tests, runtime and fresh-environment evidence. |

Helper design: standard-library Python where sufficient, Windows and POSIX path models chosen explicitly rather than host-default path guessing, entities/DTD expansion rejected, unknown XML fields retained, scoped export input instead of broad workspace access, no execution of Eclipse plugins/builders during discovery. Pin the JSON schema and tested tooling; scripts above do not exist yet. Network lookup is opt-in and sends public artifact hashes only; malformed archives and API errors remain explicit failures.

Tests: synthetic fixtures for relative/workspace/drive-letter paths, spaces and Unicode, separate variable namespaces, user-library preference escaping/export XML, missing links/JARs, nested/custom containers, filters/test/export/access rules, project cycles, source/resource collisions and APT paths. Mock HTTP only in resolver unit tests for zero/multiple matches, timeout/429 and wrong-byte candidates; use real local fixture archives and real Maven in integration tests. Windows/Eclipse/IDEA acceptance uses the synthetic demo with no mocks, recorded versions and screenshots. A controlled behavior mutation must fail the characterization checks. Assert unresolved entries stay unresolved and parsers cannot walk outside the authorized scope.

Reuse `legacy-codebase-workflows` as process, not a replacement classpath resolver: scoped inventory before repository-wide packing; navigate build wiring and original definitions/callers; preserve file/line/hash/revision evidence; separate observed/inferred/UNCONFIRMED; refresh only the affected module context; verify every migration claim against original configuration and executed behavior. Repository maps cannot resolve Eclipse plugin semantics, runtime reflection, p2 state or workspace preferences by themselves.

Dla trenera: Przećwicz przykład na docelowym Windowsie przed zajęciami; pokaż brakujące definicje, potem Maven i rzeczywisty start, a skill przedstaw jako projekt do dalszej realizacji.
