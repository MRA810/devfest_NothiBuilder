# নথি Builder (AI DevFest 2026)

**Name:** Md. Ashraful Alam Shuvo
**Registration Number:** [Your Registration Number]
**Live Website:** [LIVE_URL]

## App Instructions
1. Load `requirements.json`.
2. Upload PDF files (non-PDF, damaged and password-protected files are rejected with a message).
3. Match each file to a required document using the dropdown; enter expiry dates where asked.
4. Fix every blocking status (Missing, Expiry date needed, Expired), then press Generate and Download.

## Features Completed
- Requirements list sorted by order, tender details, Bangla/English switch
- Multi-PDF upload with page counts, removal, duplicate detection (SHA-256 of content)
- One-to-one matching with undo, expiry entry, live statuses, blocking reasons
- Package PDF: English cover, ordered documents, footer `<tender_id> | Page X of Y` in a margin strip that never covers content

## Bonus Features Completed
- Index page with start page numbers (toggle)
- CSV checklist export
- Safe handling of bad/encrypted PDFs

## Known Problems
- Cover/index use a standard PDF font (English only; Bangla text not drawn on the PDF)

## AI Tools Used
- Claude

## Most Useful Prompt
> [Paste your most useful prompt here.]

## How to Run
```bash
npm install
npm run dev
```
Build for deployment: `npm run build` (output in `dist/`).

## License
MIT License
