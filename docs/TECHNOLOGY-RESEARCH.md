# Technology research — CRA vulnerability-register PoC

Date: 22 October 2026. Input: [PRD](PRD.md).

Status: research completed for the current PoC decision; accepted choices are recorded in [ADR-000](ADR/000-main-architecture.md) and its focused ADRs. The seven architecture questions were answered: TypeScript/Node, local development only, free commercially usable components, very low volume, no data transfer now, favour speed with Ionic when comparable, and a dedicated application directory in this repository. Manual finding forms were added to the PRD. No application was scaffolded, no dependencies installed and no candidate built or started.

## 1. Confirmed constraints

- Angular is mandatory.
- Prefer Ionic when it does not materially delay the PoC. A different Angular UI toolkit is acceptable if a suitable existing template makes delivery faster.
- Persist application data in a local SQLite database, with a later path to PostgreSQL.
- Keep the scope in the PRD: vulnerability identity, distinct detection events, review/gaps, table and Kanban, reporting contexts, deterministic editable drafts and persistent data.
- Authentication, controller access, approval, sending, severe incidents and AI remain future scope. The basic inspection report is the next candidate extension after the current PoC.
- Research documentation through Context7 first; use official external sources only for information not found there.

## 2. Research procedure and verified Context7 references

Context7 resolved Ionic, Angular and Angular Components and returned documentation for starters, browser use, split-pane navigation, tables and drag/drop. The generic Angular-admin-template lookup returned framework/component documentation rather than specific dashboard repositories. Repository contents, licences and exact donor revisions were therefore inspected directly in the authors' public GitHub repositories.

Persistence and editor suitability were looked up separately in Context7. No general web search engine was used for tool discovery; external reads were restricted to the candidate authors' repositories and GitHub's public repository metadata.

| Technology | Verified Context7 ID | Findings / primary documentation |
|---|---|---|
| Ionic | `/ionic-team/ionic-docs` | Official `blank`, `tabs` and `sidemenu` starters; browser operation and split-pane navigation. [Starting an app](https://ionicframework.com/docs/developing/starting), [split pane](https://ionicframework.com/docs/api/split-pane). |
| Angular | `/websites/angular_dev` | Supported Angular/Node.js/TypeScript compatibility ranges. [Version compatibility](https://angular.dev/reference/versions). |
| Angular CDK / Material | `/angular/components` | Connected drag/drop lists, an unstyled CDK table, and Material table composition. [CDK table](https://github.com/angular/components/blob/main/src/cdk/table/table.md), [drag/drop](https://angular.dev/guide/drag-drop). |
| TypeORM | `/typeorm/typeorm` | SQLite/PostgreSQL drivers, repository-based data access, transactions and database-specific type/migration constraints. [SQLite](https://github.com/typeorm/typeorm/blob/master/docs/docs/drivers/sqlite.md), [PostgreSQL](https://github.com/typeorm/typeorm/blob/master/docs/docs/drivers/postgres.md), [migrations](https://github.com/typeorm/typeorm/blob/master/docs/docs/migrations/01-why.md). |
| ngx-quill | `/killercodemonkey/ngx-quill` | Angular editor integration, configurable toolbar and HTML/Delta/JSON/text models. The indexed compatibility table associates Angular 22 with ngx-quill 31.x or later. [Author documentation](https://github.com/killercodemonkey/ngx-quill). |
| Express | `/expressjs/express` | Small Node REST backend with explicit JSON/error handling. |
| Analog.js | `/analogjs/analog` | Evaluated genuine Angular full-stack alternative: Nitro API routes and optional client-only rendering, including Ionic integration documentation. |
| Zod | `/colinhacks/zod` | Strict shared request validation and field-path errors. |
| Vitest | `/vitest-dev/vitest` | Node/unit integration and deterministic date testing. |
| Playwright | `/microsoft/playwright` | Separate real frontend/API test servers and real browser/API requests. |

Some Ionic documentation snippets concern version 8, whereas the inspected starter declares Ionic 9. Those snippets establish concepts, not a complete version-9 compatibility guarantee. The eventual ADR must pin a compatible dependency set against the selected source revision; implementation must verify installation, build and runtime behaviour.

## 3. Candidate starters

The comparisons below describe inspected candidates, not every template available on the internet. “Not found” means the reviewed source tree did not expose a ready component or flow for that purpose; it is not a claim about all paid editions or future releases.

| Candidate | What is already present | Missing or adaptation work | Preliminary fit |
|---|---|---|---|
| [Official Ionic Angular standalone sidemenu](https://github.com/ionic-team/starters/tree/15aee8b93f46b48e4db7464bceb4b0560ea5dc35/angular-standalone/official/sidemenu) | Ionic/Angular foundation, menu, split-pane layout, routes and sample page. Repository licence: MIT. | Replace demonstration navigation; add register, event/context forms, Kanban, editor and real backend API. | Preferred candidate: directly uses the requested framework and keeps inherited application behaviour small. |
| [Ionic Conference App](https://github.com/ionic-team/ionic-conference-app/tree/6b4996ea22b81fc98e03447784f4dc366801e045) | Larger working example of Ionic/Angular screens and navigation. Declared licence: MIT. | Conference-specific flows, login pages, native projects, map/PWA/storage dependencies; no CRA register or ready Kanban identified. | Useful reference for selected patterns; poor whole-application donor because much of its scope must be removed. |
| [Ng-Matero](https://github.com/ng-matero/ng-matero/tree/d351bf5957d8c6dc9eca79d0c9b260c5b8d07822) | Material admin shell, table examples including remote-data handling, forms and an established layout. Repository licence: MIT. | Remove demo authentication/permissions and replace in-memory API behaviour; add domain workflows, Kanban and editor. Its repository also has additional charting/form/i18n tooling and Yarn-specific engine metadata. | Material alternative if an admin layout is valued more highly than starting with Ionic. Prefer the author's supported starter/schematics route over copying the entire demo. |
| [CoreUI Free Angular Admin](https://github.com/coreui/coreui-free-angular-admin-template/tree/28cc6821e772e1717f93a75947a9903d610ec00e) | Angular admin shell, dashboard/table examples and CoreUI/Bootstrap components. Declared licence: MIT. | Domain integration, Kanban and editor remain; remove unrelated examples/authentication screens. This candidate uses CoreUI/Bootstrap, not Ionic or Angular Material. | Alternative admin shell; no demonstrated reduction in the remaining CRA-specific work sufficient to displace Ionic. |

The inspected templates are frontend donors. None of the reviewed repositories supplies the PoC's complete backend intake API, relational domain model or SQLite/PostgreSQL migration workflow. Sample login screens and in-memory data services are not production authentication or a persisted backend.

MIT identification applies to the template itself. It does not establish the licensing terms of every dependency, asset, paid module or copied feature. The chosen dependency subset needs its own review before adoption; no paid functionality is assumed in the comparison.

### Source revisions and declared versions

Public GitHub commit metadata and package manifests were read at the revisions below. Versions are manifest declarations, not a resolved and verified installed dependency set.

| Repository | Inspected commit | Relevant declarations |
|---|---|---|
| `ionic-team/starters` | `15aee8b93f46b48e4db7464bceb4b0560ea5dc35` | [Standalone base manifest](https://github.com/ionic-team/starters/blob/15aee8b93f46b48e4db7464bceb4b0560ea5dc35/angular-standalone/base/package.json): Angular 22.1.7, Ionic `^9.0.0`. Combine the base with the standalone sidemenu overlay, rather than treating the overlay as a complete independent project. |
| `ionic-team/ionic-conference-app` | `6b4996ea22b81fc98e03447784f4dc366801e045` | [Manifest](https://github.com/ionic-team/ionic-conference-app/blob/6b4996ea22b81fc98e03447784f4dc366801e045/package.json): Angular `^22.0.2`, Ionic `^9.0.0`, Node.js `24.x`. |
| `ng-matero/ng-matero` | `d351bf5957d8c6dc9eca79d0c9b260c5b8d07822` | [Manifest](https://github.com/ng-matero/ng-matero/blob/d351bf5957d8c6dc9eca79d0c9b260c5b8d07822/package.json): Angular/Material `^22.2.0`, extensions `^22.1.0`; Yarn-oriented engine metadata. |
| `coreui/coreui-free-angular-admin-template` | `28cc6821e772e1717f93a75947a9903d610ec00e` | [Manifest](https://github.com/coreui/coreui-free-angular-admin-template/blob/28cc6821e772e1717f93a75947a9903d610ec00e/package.json): Angular `^22.2.3`, CoreUI Angular `~5.7.37`; Node.js compatibility declared in the manifest. |

Cached web results for unpinned package files differed from the directly fetched manifests. The commit-specific values above are the research reference; do not substitute the cached result or an arbitrary future `main` without rechecking compatibility.

## 4. Proposed frontend composition

The selected composition starts from the official standalone Ionic sidemenu and adds only the required capabilities:

| Need | Candidate | What remains application work |
|---|---|---|
| Navigation and layout | Ionic sidemenu / split pane | Replace sample folders with the register and detail/preparation screens. |
| Register | Angular CDK table with Ionic filters and controls | Define columns and map server results; sorting, filtering and pagination are composed explicitly. The CDK table does not supply all of these behaviours automatically. |
| Kanban | Angular CDK drag/drop with Ionic cards | Define four status columns and persist accepted transitions through the same API as the detail screen. Drag/drop primitives do not supply status rules or backend persistence. |
| Rich text | ngx-quill with a restricted formatting toolbar | Configure the required formatting and persist/reload content; choose a canonical format and plain-text copy behaviour in the ADR. |
| Browser/API communication | Angular frontend calling a separate server-side API | Define the transport contract, errors, filtering and idempotent intake in the ADR. |

This is a combination of a starter and reusable components, not a prebuilt vulnerability-management product. The expected speed advantage is an architectural judgement based on the inspected scope, not a measured implementation-time claim.

CDK allows custom presentation without adopting the entire Material visual system. This makes an Ionic shell plus CDK a plausible way to retain the desired UI framework from the beginning. A prototype must still verify the actual table, drag/drop scrolling, editor focus and save/copy interactions together.

Porting a Material/CoreUI admin template to Ionic would require replacing layout, navigation and visual components and checking styling and interaction behaviour. Backend contracts and isolated domain logic could remain, but this is not a simple theme change. Starting with Ionic avoids that particular later conversion; the final choice depends on the user's priority between an admin demo and the Ionic baseline.

## 5. SQLite now, PostgreSQL later

SQLite belongs behind the backend API as the shared application datastore. A separate browser-local/native-device database would not by itself satisfy a scanner intake API and a common register. Native mobile packaging and storage are not needed for the current web-only scope.

The user selected TypeScript/Node. TypeORM is selected behind a persistence boundary because it supports SQLite and PostgreSQL and exposes repository/transaction operations. PostgreSQL driver/schema implementation and transfer of existing data remain deferred; no Java port is added to the roadmap.

The migration path must distinguish three concerns:

1. **Application portability:** keep business rules and API contracts independent of database-driver details; isolate persistence operations.
2. **Schema portability:** choose deliberately compatible representations and maintain explicit migrations. SQLite-specific date/time types, SQL syntax, locking and search behaviour must not be assumed to work unchanged in PostgreSQL.
3. **Data transfer:** decide whether existing identifiers, events, drafts, submission snapshots and timestamp history must be migrated. Selecting another driver does not move existing data.

TypeORM's SQLite driver documents lock timeout/WAL options, while PostgreSQL exposes different locking facilities. Expected concurrent use and intake volume therefore remain architecture inputs. A generic ORM is not a guarantee of identical database behaviour or a reason to defer a real SQLite integration check.

No PostgreSQL server, second persistence implementation, migration utility or native SQLite package has been installed during this research. The ADR should define the intended portability boundary without turning this PoC into a multi-database platform.

## 6. Architecture answers and resulting decisions

The user's answers establish:

- TypeScript/Node backend; no requirement for Java or a Java migration commitment.
- A local development server; an API is available for a local scanner/simulator. Remote exposure is not configured.
- Free components licensed for commercial use only.
- Very few findings and a small internal team; no large-scale infrastructure or advanced grid is justified.
- Portable code boundaries, with actual PostgreSQL data transfer deferred.
- The shortest PoC path, preferring Ionic at comparable effort.
- A dedicated `app/` directory here, plus manual forms as well as API intake.

Existing PRD and repository instructions already require synthetic evaluation data, TDD for behaviour, integration coverage, real E2E flows and manual application QA. These are not reopened as optional technology questions.

Angular CLI documentation confirms development proxy support. Analog documentation confirms that a full-stack Angular meta-framework is a real option, rather than implying that `ng serve` itself supplies the business API. Express plus the unchanged standard Angular router is selected to keep the Ionic donor adaptation smaller; SSR is not required for this register.

Registry metadata was used only after Context7 did not supply exact package/peer information. It exposed two concrete version traps: TypeScript `latest` 7.0.2 does not satisfy Angular build's `>=6.0 <6.1` range, and better-sqlite3 `latest` 13.0.3 does not satisfy TypeORM 1.1.2's 12.x driver peer range. The ADR selects TypeScript 6.0.3 and better-sqlite3 12.11.1 and records the other exact direct versions. Declared compatibility remains distinct from successful installation/build evidence.

The ADR reference tables reuse the verified Context7 IDs above. No AI provider/SDK, auth module or production deployment has been selected for deferred functionality.
