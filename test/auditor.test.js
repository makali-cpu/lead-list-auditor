import test from "node:test";
import assert from "node:assert/strict";
import { auditRows, normalizeCompany, normalizeDomain, parseCsv, toCsv } from "../src/auditor.js";

test("parses quoted CSV values", () => {
  const rows = parseCsv('company,website\n"Acme, Inc.",https://acme.example\n');
  assert.equal(rows[0].company, "Acme, Inc.");
});

test("normalizes company suffixes and domains", () => {
  assert.equal(normalizeCompany("株式会社 Makali"), normalizeCompany("Makali Inc."));
  assert.equal(normalizeDomain("https://www.example.com/about"), "example.com");
});

test("flags duplicate companies and domains", () => {
  const audited = auditRows([
    { company: "Acme Inc.", website: "https://acme.example", contact: "https://acme.example/contact", email: "" },
    { company: "ACME", website: "https://www.acme.example/about", contact: "", email: "sales@acme.example" }
  ]);
  assert.deepEqual(audited[0].issues, []);
  assert.ok(audited[1].issues.some((issue) => issue.startsWith("Duplicate company")));
  assert.ok(audited[1].issues.some((issue) => issue.startsWith("Duplicate domain")));
});

test("recognizes Japanese headers and missing routes", () => {
  const audited = auditRows([{ 会社名: "テスト", 公式URL: "https://test.example", 問い合わせURL: "" }]);
  assert.ok(audited[0].issues.includes("Missing contact route"));
});

test("exports valid CSV", () => {
  assert.equal(toCsv([{ company: "Acme, Inc.", note: 'Say "hello"' }]), 'company,note\n"Acme, Inc.","Say ""hello"""');
});
