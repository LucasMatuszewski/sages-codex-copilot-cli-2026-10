#!/usr/bin/env python3
"""Run the actual course prompt runtime in Chrome, with Python stdlib only.

Usage from the repository root: python scripts/test-prompt-tools.py
Requires an installed Chrome/Chromium executable. Set CHROME_BIN to its path if
it is not on PATH. Missing Chrome is an error, not a skipped browser test.

The authored participant pack is copied to a TemporaryDirectory. Only that
copy's HTML gains an observation harness; its actual prompt-tools.js is neither
replaced nor reimplemented. A fresh temporary Chrome profile avoids user data.
No npm, browser driver, network server, install or Java build is needed.
Chrome executes the page and serializes the resulting DOM with --dump-dom:
https://developer.chrome.com/docs/automation-and-testing/headless-cli
"""

import csv
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from html.parser import HTMLParser


ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "course-materials/slides/sages-2026-10"
RESULT_ID = "prompt-tools-regression-result"

# Observe the real Blob/download boundary. Keep Chrome's native object URLs;
# prevent only the download's navigation so its payload can be asserted.
OBSERVER = r"""
<script>
window.promptRegression = {downloads: [], pending: [], errors: []};
window.addEventListener('error', event => promptRegression.errors.push(event.message));
window.addEventListener('unhandledrejection', event => promptRegression.errors.push(String(event.reason)));
(() => {
  const blobs = new Map();
  const create = URL.createObjectURL.bind(URL);
  URL.createObjectURL = blob => {
    const url = create(blob);
    blobs.set(url, blob);
    return url;
  };
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    if (!this.hasAttribute('download')) return click.call(this);
    const blob = blobs.get(this.href);
    if (!blob) throw new Error('Download did not use the observed real Blob');
    const name = this.download;
    promptRegression.pending.push(blob.text().then(text => {
      promptRegression.downloads.push({name, type: blob.type, text});
    }));
  };
})();
</script>
"""

HARNESS = r"""
<script>
(async () => {
  const result = {errors: promptRegression.errors, states: [], authored: []};
  try {
    const cards = __IDS__.map(id => {
      // Authored outer cards have stable IDs; never mirror runtime.closest().
      const card = document.getElementById(id);
      if (!card || !card.classList.contains('pcard')) throw new Error(`Missing authored card ${id}`);
      const heading = card.querySelector('h3.pt');
      if (!heading) throw new Error(`Missing authored title ${id}`);
      result.authored.push({id, title: heading.textContent.trim()});
      return {id, card, heading};
    });
    const toolbar = document.querySelector('.prompt-tools');
    if (!toolbar) throw new Error('Actual prompt runtime did not create its toolbar');
    const input = toolbar.querySelector('input[type="search"]');
    const status = toolbar.querySelector('[role="status"]');
    function snapshot(term) {
      input.value = term;
      input.dispatchEvent(new Event('input', {bubbles: true}));
      const visible = element => element.getClientRects().length > 0 &&
        getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';
      result.states.push({
        term,
        visibleCards: cards.filter(item => visible(item.card)).map(item => item.id),
        visibleHeadings: cards.filter(item => visible(item.heading)).map(item => item.id),
        status: status.textContent
      });
    }
    toolbar.querySelector('[data-export="json"]').click();
    toolbar.querySelector('[data-export="csv"]').click();
    snapshot('');
    for (const item of result.authored) snapshot(item.title);
    snapshot('__no_course_prompt_matches_this_regression_query__');
    toolbar.querySelector('[data-export="json"]').click();
    snapshot('');
    await Promise.all(promptRegression.pending);
    result.downloads = promptRegression.downloads;
  } catch (error) {
    result.errors.push(String(error));
  }
  const output = document.createElement('pre');
  output.id = 'prompt-tools-regression-result';
  output.textContent = JSON.stringify(result);
  document.body.append(output);
})();
</script>
"""


class ResultParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.parts = []

    def handle_starttag(self, tag, attributes):
        if tag == "pre" and dict(attributes).get("id") == RESULT_ID:
            self.active = True

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == "pre":
            self.active = False


def find_chrome():
    configured = os.environ.get("CHROME_BIN")
    candidates = [configured] if configured else [
        "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"
    ]
    for candidate in candidates:
        found = shutil.which(candidate)
        if found:
            return found
    raise RuntimeError(
        "Chrome/Chromium is required for prompt DOM regression tests. "
        "Provide an installed executable on PATH or set CHROME_BIN to its path."
    )


def browser_result(chrome, manifest):
    with tempfile.TemporaryDirectory(prefix="prompt-tools-regression-") as temporary:
        temporary = Path(temporary)
        fixture = temporary / "participant-course"
        shutil.copytree(COURSE, fixture)
        page = fixture / "prompty.html"
        authored = page.read_text(encoding="utf-8")
        if authored.count("</head>") != 1 or authored.count("</body>") != 1:
            raise RuntimeError("Expected one complete authored prompty.html document")
        harness = HARNESS.replace("__IDS__", json.dumps([item["id"] for item in manifest]))
        page.write_text(
            authored.replace("</head>", OBSERVER + "</head>", 1).replace("</body>", harness + "</body>", 1),
            encoding="utf-8",
        )
        command = [
            chrome, "--headless", "--disable-gpu", "--no-first-run",
            "--no-default-browser-check", "--disable-background-networking",
            "--disable-extensions", "--disable-sync", "--disable-dev-shm-usage",
            f"--user-data-dir={temporary / 'chrome-profile'}",
            "--virtual-time-budget=5000", "--dump-dom", page.as_uri(),
        ]
        completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", timeout=40)
        if completed.returncode:
            raise RuntimeError(f"Chrome exited {completed.returncode}: {completed.stderr[-2000:]}")
        parser = ResultParser()
        parser.feed(completed.stdout)
        if not parser.parts:
            raise RuntimeError("Chrome produced no completed browser regression result")
        return json.loads("".join(parser.parts))


class PromptToolsBrowserTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        chrome = find_chrome()
        version = subprocess.run([chrome, "--version"], capture_output=True, text=True, timeout=10, check=True)
        print(f"Browser: {version.stdout.strip()}", flush=True)
        cls.manifest = json.loads((COURSE / "prompts/manifest.json").read_text(encoding="utf-8"))["prompts"]
        cls.expected = {item["id"]: item for item in cls.manifest}
        cls.markdown = {
            item["id"]: (COURSE / "prompts" / item["source"]).read_text(encoding="utf-8")
            for item in cls.manifest
        }
        cls.result = browser_result(chrome, cls.manifest)
        if cls.result["errors"]:
            raise RuntimeError("Actual page script errors: " + "; ".join(cls.result["errors"]))
        cls.titles = {item["id"]: item["title"] for item in cls.result["authored"]}
        cls.json_downloads = [json.loads(item["text"]) for item in cls.result["downloads"] if item["name"] == "prompty.json"]

    def test_json_metadata_and_lossless_markdown_for_all_12_prompts(self):
        self.assertEqual(len(self.manifest), 12)
        self.assertEqual(len(self.json_downloads), 2)
        for records in self.json_downloads:
            self.assertEqual(len(records), 12)
            self.assertEqual({item["id"] for item in records}, set(self.expected))
            for record in records:
                with self.subTest(prompt=record["id"]):
                    expected = self.expected[record["id"]]
                    self.assertEqual(record["title"], self.titles[record["id"]])
                    self.assertTrue(record["title"], "Authored outer card title is required")
                    self.assertEqual(record["source"], "prompts/" + expected["source"])
                    self.assertEqual(record["version"], expected["version"])
                    self.assertEqual(record["category"], "developer")
                    self.assertTrue(record["body"] == self.markdown[record["id"]], "Export body differs from authoritative Markdown")
                    for field in ("prerequisites", "tool", "provenance"):
                        self.assertTrue(record[field].strip(), f"Missing {field}")

    def assert_state(self, state, matches):
        self.assertEqual(set(state["visibleCards"]), matches, "Filter must hide the entire nonmatching card")
        self.assertEqual(set(state["visibleHeadings"]), matches, "Card title must disappear with a nonmatch")
        self.assertEqual(state["status"], f"Prompty: {len(matches)} / 12")

    def test_every_authored_title_filters_the_whole_card(self):
        states = self.result["states"]
        self.assertEqual(len(states), 15)
        for state in states[1:13]:
            with self.subTest(query=state["term"]):
                matches = {
                    prompt_id for prompt_id in self.expected
                    if state["term"].casefold() in (self.titles[prompt_id] + "\n" + self.markdown[prompt_id]).casefold()
                }
                self.assertTrue(matches, "An authored title must match at least its own prompt")
                self.assert_state(state, matches)

    def test_nonmatch_hides_every_card_and_heading(self):
        self.assert_state(self.result["states"][-2], set())

    def test_empty_query_and_reset_restore_all_cards(self):
        self.assert_state(self.result["states"][0], set(self.expected))
        self.assert_state(self.result["states"][-1], set(self.expected))

    def test_json_download_is_complete_even_after_a_nonmatching_filter(self):
        self.assertEqual(self.json_downloads[0], self.json_downloads[1])

    def test_csv_download_round_trips_all_json_fields(self):
        downloads = [item for item in self.result["downloads"] if item["name"] == "prompty.csv"]
        self.assertEqual(len(downloads), 1)
        rows = list(csv.DictReader(io.StringIO(downloads[0]["text"].removeprefix("\ufeff"))))
        self.assertEqual(len(rows), 12)
        records = {record["id"]: record for record in self.json_downloads[0]}
        self.assertEqual({row["id"] for row in rows}, set(records))
        for row in rows:
            with self.subTest(prompt=row["id"]):
                escaped = json.loads(row.pop("csv_escaped_fields"))
                for field in escaped:
                    self.assertTrue(row[field].startswith("'"))
                    row[field] = row[field][1:]
                self.assertEqual(row, records[row["id"]])


if __name__ == "__main__":
    unittest.main(verbosity=2)
