# Sygnity website design reference

Source: [Sygnity](https://www.sygnity.pl/), resolved in the browser to the [English homepage](https://www.sygnity.pl/en/sygnity-en/). Captured on 2026-10-07 using Chrome and Playwright CLI 0.1.22 with a visible browser window, at a 1440 × 1000 CSS-pixel viewport. This is an extracted desktop reference, not an official Sygnity brand manual. Values below come from visible components and computed styles after rejecting optional cookies; hidden consent controls and inactive template defaults are excluded from token selection.

## Assets

| File | Purpose |
|---|---|
| [Design tokens](../assets/design-tokens.json) | Structured colors, typography, spacing and component styles |
| [Design observations](../assets/design-observations.json) | Browser measurements, font declarations and asset provenance |
| [Homepage screenshot](../assets/homepage.png) | Full-page desktop reference, visually reviewed without a cookie banner |
| [Primary logo](../assets/logo.svg) | Original cyan SVG wordmark from the header |
| [White logo](../assets/logo-white.png) | Original 116 × 35 PNG wordmark from the footer |
| [Favicon](../assets/favicon.png) | Original PNG site icon |
| [Glyphicons Halflings](../assets/fonts/glyphicons-halflings/glyphicons-halflings-regular.woff2) | Locally served icon font |
| [FontAwesome](../assets/fonts/fontawesome/fontawesome-webfont.woff2) | Legacy icon font |
| [Font Awesome 5 Brands](../assets/fonts/font-awesome-5-brands/fa-brands-400.woff2) | Brand/social icons, weight 400 |
| [Font Awesome 5 Free regular](../assets/fonts/font-awesome-5-free/fa-regular-400.woff2) | Regular icons, weight 400 |
| [Font Awesome 5 Free solid](../assets/fonts/font-awesome-5-free/fa-solid-900.woff2) | Solid icons, weight 900 |
| [Elementor eicons](../assets/fonts/eicons/eicons.woff2) | Elementor icon font |
| [WordPress dashicons](../assets/fonts/dashicons/dashicons.ttf) | WordPress icon font |
| [GeneratePress](../assets/fonts/generatepress/generatepress.woff2) | Theme icon font |
| [LightGallery lg](../assets/fonts/lg/lg.woff2) | Gallery icon font |

Logo, favicon and font usage/redistribution rights must be verified before reuse. The downloaded icon fonts are source-site implementation assets, not the primary text typefaces; new interfaces do not need to adopt every plugin font.

## Colors

| Token | Value | Observed usage |
|---|---|---|
| `colors.brand.primary` | `#00AEEF` | Wordmark family, CTAs, links in branded components, display heading, active language |
| `colors.brand.accent` | `#FFB251` | Small news-category labels; use sparingly |
| `colors.background.default` | `#FFFFFF` | Header and principal content surfaces |
| `colors.background.light` | `#F9F9F9` | Alternating sections and news-card surfaces |
| `colors.background.footer` | `#B5B5B5` | Footer strip |
| `colors.text.primary` | `#3A3A3A` | Body copy |
| `colors.text.secondary` | `#54595F` | Section labels and service descriptions |
| `colors.text.muted` | `#666666` | Main navigation and input text |
| `colors.text.utility` | `#333333` | Inactive language option |
| `colors.text.onDark` | `#FFFFFF` | Filled CTA labels and offer-card titles |
| `colors.text.hero` | `rgba(255, 255, 255, 0.8)` | Translucent white hero text |
| `colors.text.footer` | `#E9E9E9` | Footer links |
| `colors.text.link` | `#1E73BE` | Theme-level link fallback, distinct from branded CTA cyan |
| `colors.border.input` | `#CCCCCC` | Form outlines |

Error, success and hero-overlay tokens are `null`: the capture did not establish their intended contracts. Do not interpret a CSS class such as `btn-success` as a green success color; the visible news CTA is cyan.

## Typography

The primary family is **Montserrat**, with `sans-serif` fallback. The introductory display heading uses **Lora**, with the site's observed `sans-serif` fallback; a single emphasized word uses Lora italic. Text fonts are delivered through third-party Google Fonts CSS, and were not downloaded. Cross-origin stylesheet rules were unavailable through CSSOM; the resolved computed families and successful browser font checks provide the observation, not a local text-font package. Other loaded Google Fonts families are not promoted to brand tokens without visible usage.

| Role | Family | Size / line height | Weight |
|---|---|---|---|
| Body | Montserrat | 16px / 24px | 400 |
| Main navigation | Montserrat | 17px / 40px | 400 |
| Utility text / CTAs | Montserrat | 14px / 20–21px | 400; active language 500 |
| Offer-card title | Montserrat | 24px / 28.8px | 300 |
| Section label | Montserrat | 25px / 37.5px | 400 |
| Hero heading | Montserrat | 32px / 38.4px | 500 |
| Introductory display | Lora | 38px / 53.2px | 400, selective italic emphasis |

The observed weight scale is 300, 400, 500 and 600. A 12px size appears in small metadata. This is a measured set of role sizes, not evidence of a mathematical type scale. The first `h2` in the DOM is the small stock-price label; do not use it as the default section heading.

### Local icon-font declarations

All nine downloaded files are listed with repository paths in the Assets table. The site's `@font-face` declarations use `normal` style and weight 400 for Glyphicons Halflings, FontAwesome, Font Awesome 5 Brands, regular Font Awesome 5 Free, eicons, dashicons, GeneratePress and lg; solid Font Awesome 5 Free uses weight 900. Their sources are same-origin WordPress/theme/plugin directories, recorded in `design-observations.json`. `swiper-icons` uses an embedded data font and has no downloaded file. Verify each font's license and required notices before use.

Example declaration when the stylesheet lives under `assets/`:

```css
@font-face {
  font-family: "Font Awesome 5 Brands";
  src: url("./fonts/font-awesome-5-brands/fa-brands-400.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: block;
}
```

## Spacing and layout

No consistent original base unit was established. The JSON spacing keys group observed values, rather than declaring a 4px or 8px system. Common values are 6, 8, 10, 12, 15, 20, 24, 25, 30, 45, 50 and 90px.

- Hero CTAs use 8px vertical and 12px horizontal padding; news CTAs use 6px and 12px.
- Inputs use 10px vertical and 15px horizontal padding. Paragraphs commonly end with 24px margin.
- The white desktop header uses 20px vertical section padding and measures 100px high. Navigation links use 10px horizontal padding.
- Main boxed containers measure 1140px, with 1120px inner content. Typical section padding is 50px vertically; the introduction uses 90px.
- Centered section labels are followed by a short 50 × 2px divider. News cards form a three-column desktop grid; offer, technology and partner rows use carousels.

Responsive breakpoints and mobile layouts were not verified. Treat the widths above as desktop references and choose responsive behavior deliberately when implementing a new interface.

## Border radius and shadows

| Token | Value | Context |
|---|---|---|
| `none` | 0px | Structural sections and news-card boxes |
| `sm` | 2px | News CTA |
| `md` | 3px | Hero CTA, submit control, inputs |
| `lg` | 5px | Offer-card images |
| `circle` | 50% | Social icon backgrounds and carousel indicators |

Offer images use `rgba(0, 0, 0, 0.5) 0px 0px 25px -2px`. News cards use `rgba(0, 0, 0, 0.5) 0px 14px 6px -10px`. Keep corners modest and preserve the large whitespace between sections.

## Components

**Header and navigation.** A single white horizontal desktop header contains the cyan wordmark, gray text navigation with dropdown indicators, language options, a compact share-price widget and round cyan social links. The header logo measured approximately 141 × 42px. Navigation is sentence case, Montserrat 17px/400, with a 40px line box. The active language uses cyan and weight 500.

**Hero and introductory heading.** The hero is a full-width photographic carousel with a left text block, white translucent 32px/500 headings and small cyan CTAs. The separate introduction pairs a cyan Lora heading with body copy in two columns. Only selective display words are italic; body copy remains Montserrat.

**Buttons and links.** Hero CTAs use cyan, white labels, 3px corners and 8px 12px padding. News CTAs use 2px corners and 6px 12px padding. The contact submit control was observed disabled, with a cyan background, 40px line height and 15px horizontal padding. No hover/focus token or enabled-submit behavior was verified; those states remain explicit unknowns.

**Inputs and contact panel.** White text inputs and textarea have a 1px `#CCCCCC` border, 3px corners, 10px 15px padding and Montserrat 16px/24px text. The contact panel is centered on a white surface with a subtle outline/shadow, visible labels, consent checkbox and a small submit control. No form was submitted and no personal data was entered.

**Content cards.** Offer cards combine photographic imagery, white lightweight 24px labels and a lower-right CTA. News cards use light surfaces, cyan top accents, small warm category labels and cyan article links. Technology and partner marks are kept as their original multicolor logos; they are not the site's brand palette and were not downloaded.

**Footer.** A gray strip uses the white wordmark and light 14px links. Its observed section padding is 15px 15px 0px. No promotional bar was observed.

## Logo usage

Use [logo.svg](../assets/logo.svg) on white or very light surfaces. It is the original header wordmark, fetched from `https://www.sygnity.pl/wp-content/uploads/2022/05/logo_Sygnity_top.svg`; preserve its proportions and artwork. The [white PNG variant](../assets/logo-white.png), from `https://www.sygnity.pl/wp-content/uploads/2019/04/logo_white.png`, is the existing inverted mark for gray or dark surfaces. Its native size is 116 × 35px, so avoid scaling it substantially upward. No official clear-space or minimum-size rule was supplied; obtain the brand manual before defining those requirements.

## Visual style summary

The site presents an established technology company through restrained gray typography, bright cyan accents and generous white space. Large industry photographs support a practical corporate tone. Montserrat provides clear interface text, while the Lora introduction adds an editorial accent. Subtle corners, small CTAs and centered section dividers keep the overall composition orderly.

## Capture limits and verification

The saved 1425 × 5472px screenshot was taken again in the headed browser after scrolling through the page to load lower sections; its width excludes the 15px browser scrollbar within the 1440px viewport. Cookie rejection persisted, and both the browser check and visual review confirmed no consent banner or modal. The site's own reCAPTCHA badge remains visible as part of the unmodified source page. Carousel content can vary between captures; this screenshot shows a successfully loaded photographic slide.

The source page logged a DNS failure for `https://clonewww.sygnity.pl/wp-content/uploads/2020/04/slide1.jpg`. That source-site issue was not repaired or substituted. Component default styles, downloaded font signatures, SVG/PNG format, asset paths, JSON parsing and documentation links were checked. This task does not establish mobile behavior, interactive state colors, semantic validation colors, asset licensing or JFTP runtime behavior.
