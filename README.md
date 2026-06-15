# Lead List Auditor

A privacy-first browser tool for checking B2B lead lists before outreach.

It detects:

- duplicate company names
- duplicate website domains
- missing required fields
- non-corporate email addresses
- blocked keywords such as marketplaces or directories

All processing happens locally in your browser. Files are not uploaded to a
server.

## Try it

1. Download this repository.
2. Start a local server: `python3 -m http.server 4173`.
3. Open `http://localhost:4173` in a modern browser.
4. Upload a CSV or use the included sample data.
5. Review flagged rows and export the clean list.

Expected columns are `company`, `website`, `contact`, and `email`. Common
Japanese column names such as `会社名`, `公式URL`, and `問い合わせURL` are also
recognized.

## Why this exists

Lead research often produces duplicates, directory pages, missing contact
routes, and records that are not ready for outreach. This small tool makes the
quality check repeatable without sending business data to an external service.

## Development

No build step or dependency installation is required.

```bash
npm test
```

To preview the app locally:

```bash
python3 -m http.server 4173
```

## 日本語

営業リストを送信前に点検する、ブラウザ完結型の無料ツールです。会社名・
ドメインの重複、必須項目の不足、フリーメール、除外キーワードを検出します。
データはサーバーへ送信されません。

## License

MIT
