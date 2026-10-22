# CRA reporting research and information catalogue

Research date: 22 October 2026. This document supports the [PoC PRD](PRD.md).

This is a product requirements research note, not a determination that a particular supplier, contract or product falls within the CRA. No customer contracts, real vulnerability reports or government systems were inspected. The application is a new proposal; it is unrelated to the repository's existing jFTP exercise.

## 1. Sources and authority

| ID | Primary source | Use and verification |
|---|---|---|
| S1 | [Regulation (EU) 2024/2847, official text](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng) | Binding law: Articles 2, 3, 14, 16, 69 and 71. EUR-Lex interactive pages returned an automated-access challenge. The relevant statutory passages were verified through indexed official EUR-Lex text/PDF excerpts, including Articles 14(2), 14(4)-(8), and Article 2(7)-(8). |
| S2 | [European Commission: CRA reporting obligations](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting) | Current reporting dates, stages, recipients and platform. |
| S3 | [Commission guidance C(2026) 5252, publication and download links](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-new-guidance-support-timely-cyber-resilience-act-implementation) | Non-binding interpretation, published 27 July 2026. The [official annex](https://ec.europa.eu/newsroom/dae/redirection/document/131456) was downloaded and its text read, particularly paragraphs 209-221. |
| S4 | [ENISA Single Reporting Platform](https://www.enisa.europa.eu/topics/product-security/vulnerability-services/eu-incident-response-and-cyber-crisis-management/single-reporting-platform-srp) | Official channel and current operational documentation. The page identifies SRP version 1.1, upgraded on 12 October 2026. |
| S5 | [ENISA SRP FAQ](https://www.enisa.europa.eu/topics/product-security/vulnerability-services/eu-incident-response-and-cyber-crisis-management/single-reporting-platform-srp/frequently-asked-questions) | Updated 15 October 2026; definitions, reporting process and deadlines. |
| S6 | [ENISA SRP Glossary](https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/cra-srp-glossary2) | Version 1.6, updated 21 October 2026; platform fields and stage-specific requirements. This is platform guidance, not additional statutory wording. |
| S7 | [Polish Ministry of Digital Affairs: SRP and Polish coordination](https://www.gov.pl/web/cyfryzacja/europejska-platforma-zglaszania-podatnosci-i-incydentow-w-ramach-aktu-o-cyberodpornosci) | Published 24 September 2026; confirms CSIRT NASK as the Polish coordinator and reporting through SRP. |

The act takes precedence over explanatory guidance. Platform requirements can change; the glossary version above is the reference for this PoC, not a promise of permanent compatibility.

## 2. Scope: a government customer does not by itself establish applicability

CRA is an EU regulation concerning products with digital elements. Its manufacturer definition concerns the entity developing, or commissioning development of, a product and marketing it under its own name or trademark. Supplying software commercially to a public institution requires an assessment of the product and responsible economic operator; the customer's public status alone is insufficient. The software author and legally responsible manufacturer need not be the same organisation. [S1, Articles 2 and 3(13)]

Products developed or modified exclusively for national security or defence, and products specifically designed to process classified information, are excluded under Article 2(7). Article 2(8) also protects information whose disclosure would conflict with essential national security, public security or defence interests. These provisions do not create a blanket exclusion for all ministry software. [S1]

**Product consequence:** each reporting context needs a manufacturer, product, applicability assessment and rationale. Unknown applicability remains an open review item. The PoC does not decide the law automatically or assume that a client is the manufacturer.

No contract requiring a particular government mailbox was provided. No general obligation to email every scanner finding was established. Any contract-specific email procedure must be documented separately before it is treated as a requirement.

Other regimes, such as KSC/NIS2 incident reporting, personal-data breach reporting and individual procurement contracts, may require separate assessments. They are not mapped or implemented by this PoC, and CRA completion must not imply completion under those regimes.

## 3. What must be reported

An actively exploited vulnerability requires reliable evidence of exploitation by a malicious actor without the system owner's permission. A CVE, a high severity score, a public proof of concept or a dependency scanner match is not, by itself, that evidence. [S1, Article 3(42); S5]

The Commission guidance distinguishes the initial signal from awareness established through prompt assessment, and discusses product-specific exploitation of third-party components. A shared dependency alert must therefore retain its evidence and be assessed in the affected product's context. Unknown facts must remain unknown. [S3, paragraphs 213-218]

For PoC purposes, retain all identifiable findings. Separately record whether the product is affected, whether exploitation is supported by evidence and whether Article 14 notification is considered required. A manual decision records a rationale; it does not erase an earlier awareness timestamp supplied with the finding.

The reporting provisions have applied since **11 September 2026**, including to relevant products placed on the market before the CRA's general application date of **11 December 2027**. The PoC must not postpone reporting functionality until 2027. [S1, Articles 69(3) and 71; S2]

## 4. Actively exploited vulnerability: reporting stages

The summaries below describe legal information requirements, not a database design. [S1, Article 14(1)-(2), (6)-(8)]

| Stage | Timing | Information to collect |
|---|---|---|
| Early warning | Without undue delay; within 24 hours of awareness | Identification of the actively exploited vulnerability; relevant Member States where the manufacturer knows the product was made available, where applicable. Product identification and awareness evidence support a usable report. |
| Vulnerability notification | Without undue delay; within 72 hours of awareness, unless the relevant information was already supplied | Available general product information; nature of the vulnerability and exploit; corrective or mitigating actions taken; actions users can take; sensitivity of the information where applicable. |
| Final report | No later than 14 days after a corrective or mitigating measure becomes available, unless the relevant information was already supplied | Vulnerability description, severity and impact; malicious actor information where available; details of the available security update or other corrective measures. |
| Intermediate report | When requested by the coordinating CSIRT | Relevant status updates and the request context. Article 14(6) does not set a universal additional numerical deadline. |
| Communication to impacted users | After awareness, with appropriate information and measures | Affected audience, vulnerability information and necessary mitigation/correction instructions. This is a distinct obligation from submitting to authorities. |

The 24-hour and 72-hour limits share the awareness anchor. The 72-hour limit is not 72 hours after the early warning. A final-report anchor is measure availability, not discovery, an internal ticket closure or the next scanner run. Missing later-stage details do not justify waiting to prepare an early warning.

The PoC displays these outer limits as planning aids and records the underlying dates. It does not approve an extension, decide that a prior report legally satisfies a later stage, or claim that a user has complied merely by saving text.

## 5. Recipient and channel

CRA notification is made through the single reporting platform to the coordinating CSIRT with access for ENISA under the applicable rules. For a manufacturer whose relevant establishment is in Poland, the Polish ministry identifies CSIRT NASK as coordinator. The relevant establishment, not the location of each customer, determines the initial routing. [S1, Articles 14(7) and 16; S2; S7]

The [ENISA SRP portal](https://portal.cra-srp.enisa.europa.eu/) is the formal external channel. A copied email draft is preparation material. It is not an SRP submission, receipt or acknowledgement. [S4]

The PoC will not implement special dissemination-delay procedures under Article 16, contact a CSIRT, access SRP or send email. It can retain a sensitivity explanation and a manually entered external reference. Specialist external handling remains outside the application.

## 6. Why severe incidents are deferred

Severe incidents are a separate Article 14(3)-(5) reporting path. The statutory criteria include effects, or potential effects, on important security properties and introduction or execution of malicious code. Their early warning includes suspected unlawful or malicious causation; their later reports include an initial assessment and likely threat/root cause. Their final report is due within one month after the incident notification, rather than the vulnerability's measure-availability rule. [S1]

These differences require additional information and behaviour, not just a renamed vulnerability category. Following the user's conditional scope decision, severe-incident intake, screens, templates and deadlines are future functionality. No incident fields are mandatory for PoC vulnerability records.

## 7. Information catalogue

The following are **business information items**, not tables, column names, API syntax or storage types. “Required for intake” means the PoC can identify and retain a finding; legal completeness is evaluated separately for each report stage. Client and product names are ordinary text in the PoC.

### 7.1 Shared vulnerability information

One vulnerability represents the same underlying weakness across products, clients and detection dates.

| Information | Purpose / requirement |
|---|---|
| Internal reference and stable source identity | Required for identity; accept a CVE or a stable source-specific vulnerability reference. A CVE is not mandatory. |
| Public identifiers and aliases | CVE, EUVD or other supplied references; preserve source and avoid merging unrelated identifiers. |
| Title and description | Human-readable explanation; missing descriptions are retained as gaps. |
| Component identification | Library/framework/component name, ecosystem, vendor and affected component versions when known. |
| Weakness category | Dependency vulnerability, application-code vulnerability or other/unknown; optional weakness classification such as CWE. These are product categories, not statutory reportability outcomes. |
| Severity and rationale | Critical, high, medium, low or unknown; supplied score, scoring method/version and source when available. A score does not decide legal reportability. |
| General exploit description and prerequisites | What the weakness allows and the conditions required. |
| Public exploitation information and references | Known/unknown evidence, origin and observation date; not automatic proof that every linked product qualifies. |
| Remediation guidance and fixed component versions | Reusable advisory information; distinguish an upstream fix from availability of a measure for a particular affected product. |
| Information sources and knowledge date | Links or references and when the information was obtained; human additions remain distinguishable from scanner observations. |
| Tags, handling status and shared information gaps | Support search and review independently of individual detections. |

### 7.2 Detection events

An event states that a particular source detected the vulnerability at a particular time in a particular context. Another observation is a new event; retrying delivery of the same observation is not.

The clarified PoC also accepts manual findings. The form supplies internal vulnerability/event references when no external identifiers exist and preserves manual origin; the same missing-information and reporting-evidence rules apply. This does not require a public CVE to exist or establish authenticated attribution.

| Information | Purpose / requirement |
|---|---|
| Source and source event reference | Required; identifies an observation and recognises repeated delivery. |
| Vulnerability identity | Required; connects the event to its shared vulnerability. |
| Detection time and receipt time | Known detection time, or an explicit gap if missing, and recorded receipt time; preserve their difference. |
| Client, product and product version | Contextual text; unknown values are gaps rather than grounds to discard an identifiable finding. |
| Environment or installation reference | Optional distinction between occurrences of the same product/version. |
| Installed component version and location | Observed dependency version and location/manifest reference where supplied. |
| Scanner assessment and evidence | Original category, severity, exploit signal and supporting text/reference; no raw log archive is required. |
| Product-specific impact and exploitability | Assessment and evidence concerning this product, including unknown/not affected. |
| Handling status, event gaps and review notes | Independent from shared vulnerability status. |
| First and subsequent observations | Derived from retained distinct events; cannot replace legal awareness dates. |

### 7.3 Reporting context and prepared reports

A reporting context is the operator's selected grouping of relevant events for one manufacturer and affected product. It keeps preparation and deadlines together across repeated observations and clients. This is a functional grouping, not a requirement for an additional technical subsystem. Whether one formal SRP notification should cover additional products remains an external reporting decision.

| Information | Purpose / requirement |
|---|---|
| Context reference and included events | Identifies the scope of each report; preserves product versions and client distinctions. |
| Responsible manufacturer and reporting contact | Required for meaningful preparation; contact may be an organisational mailbox. |
| Manufacturer establishment / coordinating CSIRT | Supports routing; do not infer the coordinator from a customer's ministry. |
| CRA applicability and rationale | In scope, out of scope or not assessed; not assessed is the initial state. |
| Product affected assessment | Affected, not affected or unknown, with supporting rationale. |
| Active exploitation assessment and evidence | Confirmed, not established or unknown, with provenance. |
| Article 14 notification assessment | Required, not required or undecided, with explanation; initially undecided. |
| Manufacturer awareness time and supporting basis | Legal timing anchor, distinct from detection, receipt and review time; preserve supplied earlier dates. |
| Date accuracy / uncertainty | Exact, estimated or unknown; estimated values must be labelled. |
| Relevant Member States | Where the product was made available, where applicable; not necessarily customer address countries alone. |
| General vulnerability/exploit account | Context-specific account for the notification. |
| Impact, severity and attribution | Product-specific impact, severity rationale and malicious actor information if available; unknown attribution is permissible. |
| Measures taken and user actions | Completed mitigations, workarounds and recommended correction steps. |
| Measure availability time and details | Final-report timing anchor plus fix/update description and affected/fixed versions. |
| Sensitivity explanation | Relevant restrictions on the information; not an access-control mechanism in this PoC. |
| Stage and information gaps | Early warning, 72-hour notification, final or requested intermediate report; assess each independently. |
| Editable subject/body and save time | Persistent prepared text, separate from structured source information. |
| External submission record | Optional manually entered stage, actual time and reference; labelled as a user's record, not verified delivery. |
| CSIRT request and requested response date | Optional intermediate-report context; no invented statutory deadline. |
| User-information follow-up | Audience summary, instructions, communication state/date and reference; actual communication remains external. |

### 7.4 SRP field alignment

This compact mapping reflects S6, version 1.6. It does not reproduce the complete platform or declare every useful internal field legally mandatory.

| SRP group | PoC mapping |
|---|---|
| Required initial identification | Notification type, title, summary, manufacturer, Member States, product, version and awareness time. |
| Optional initial identifiers | CVE and EUVD; absence does not prevent intake. |
| Required 72-hour AEV narrative | General vulnerability/exploit information. |
| Required final material | Measures taken; user measures; availability date; update details; severity; impact; actor information if available. |
| Optional context | Product regulatory type/class/category, support-end indicator, component, expected mitigation, user action, sensitivity and attack vector. |
| Exceptional dissemination | PEC fields are not implemented. |

Verified SRP limits: title/product/version/component and public identifiers 255 characters; summary/general AEV account/severity/impact/user guidance 4,000; measures taken/update details 2,000; sensitivity 255; actor 100. These are **external platform limits**, not reasons to truncate stored internal information. Stage validation flags overlong mapped content. Free-form draft text is not a direct SRP import. [S6]

## 8. Data-quality and deadline rules derived for the PoC

1. Keep the shared vulnerability identity separate from observations and legal reporting scope.
2. Accept identifiable incomplete findings; identify gaps at the shared, event and report-stage levels.
3. Never replace an unknown fact with “No”, zero severity, a guessed actor or the current time.
4. Use explicit stable identities for deduplication. Similar titles are insufficient evidence of identity.
5. Repeated observations and transport retries do not create new reporting clocks. A later human review does not move an earlier awareness date forward.
6. A global advisory change may inform review but does not prove exploitation in every linked product.
7. Show 24-hour and 72-hour limits from awareness and the final-report limit from measure availability. Unknown anchors show an unresolved date, not a compliant state.
8. Keep saved drafts when structured information changes; show that the draft may need updating.
9. A prepared or copied draft is never evidence of submission. A manually recorded external submission remains explicitly unverified.
10. Full legal compliance, classification disputes, overlapping regimes and any contractual mailbox obligation require decisions outside this PoC.

## 9. Unresolved organisational facts

The manufacturer for each real product, applicability/exclusions, the evidence establishing product-specific active exploitation, the exact awareness time, and any additional contractual recipient are not known from this brief. They are supported as reviewable information rather than invented defaults. No real mailbox is hardcoded, and no synthetic draft is sent to a real authority.
