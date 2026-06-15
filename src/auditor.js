const DEFAULT_ALIASES = {
  company: ["company", "company name", "name", "会社名", "企業名", "ブランド名"],
  website: ["website", "url", "official url", "公式url", "公式サイト", "webサイト"],
  contact: ["contact", "contact url", "inquiry", "問い合わせurl", "問い合わせ", "問合せurl"],
  email: ["email", "e-mail", "mail", "メール", "メールアドレス"]
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.jp",
  "outlook.com",
  "hotmail.com",
  "icloud.com"
]);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, ""));
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

export function normalizeCompany(value = "") {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/株式会社|有限会社|合同会社|inc\.?|ltd\.?|llc|co\.?|company/g, "")
    .replace(/[^a-z0-9\p{L}]/gu, "");
}

export function normalizeDomain(value = "") {
  if (!value.trim()) return "";
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function resolveColumns(headers, aliases = DEFAULT_ALIASES) {
  const normalized = new Map(headers.map((header) => [header.trim().toLowerCase(), header]));
  return Object.fromEntries(
    Object.entries(aliases).map(([key, options]) => [
      key,
      options.map((option) => normalized.get(option)).find(Boolean) ?? ""
    ])
  );
}

export function auditRows(rows, options = {}) {
  if (rows.length === 0) return [];
  const columns = resolveColumns(Object.keys(rows[0]));
  const blockedKeywords = (options.blockedKeywords ?? ["marketplace", "directory", "wikipedia"])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const seenCompanies = new Map();
  const seenDomains = new Map();

  return rows.map((row, index) => {
    const company = columns.company ? row[columns.company] : "";
    const website = columns.website ? row[columns.website] : "";
    const contact = columns.contact ? row[columns.contact] : "";
    const email = columns.email ? row[columns.email] : "";
    const companyKey = normalizeCompany(company);
    const domain = normalizeDomain(website);
    const issues = [];

    if (!company) issues.push("Missing company name");
    if (!website) issues.push("Missing website");
    else if (!domain) issues.push("Invalid website URL");
    if (!contact && !email) issues.push("Missing contact route");

    if (companyKey && seenCompanies.has(companyKey)) {
      issues.push(`Duplicate company (row ${seenCompanies.get(companyKey)})`);
    } else if (companyKey) {
      seenCompanies.set(companyKey, index + 2);
    }

    if (domain && seenDomains.has(domain)) {
      issues.push(`Duplicate domain (row ${seenDomains.get(domain)})`);
    } else if (domain) {
      seenDomains.set(domain, index + 2);
    }

    const emailDomain = email.includes("@") ? email.split("@").pop().toLowerCase() : "";
    if (emailDomain && FREE_EMAIL_DOMAINS.has(emailDomain)) issues.push("Free email address");

    const searchable = `${company} ${website}`.toLowerCase();
    const blocked = blockedKeywords.find((keyword) => searchable.includes(keyword));
    if (blocked) issues.push(`Blocked keyword: ${blocked}`);

    return {
      rowNumber: index + 2,
      data: row,
      issues,
      status: issues.length === 0 ? "ready" : "review"
    };
  });
}

export function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((values) => values.map(escape).join(","))
    .join("\n");
}
