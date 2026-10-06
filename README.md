# নথি Builder (AI DevFest 2026)

**Name:** Md. Ashraful Alam Shuvo
**Live Website:** https://nothi-builder.netlify.app

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

- **Bangla on the PDF:** the cover and index pages use a standard PDF font (Helvetica), so they are English only. Bangla text is not drawn on the PDF, and any character outside basic Latin (for example in a bidder name or title) is replaced with `?`.
- **Rotated pages:** pages that carry a PDF `/Rotate` setting may not keep their rotation when merged into the package.
- **Duplicate detection is exact:** two files are marked as duplicates only when their bytes are identical (SHA-256). The same document re-saved or re-exported, with different bytes, is not detected.
- **No saved work:** matches and expiry dates live in memory only. Refreshing the page clears them, and only the light/dark theme choice is remembered.
- **Bonus features not done:** seal/signature placement, auto-match by file name, AI help, and Bangla text on the PDF.
- **Package must be regenerated after any change:** editing a match, an expiry date, the index toggle or the file list clears the old package, so Generate has to be pressed again before downloading.
- **Footer strip changes page size:** each document page is placed above a 34 pt footer strip so the footer never covers content. This makes every document page slightly taller than the original.
- **Very long requirement lists:** the cover and index are one page each. The row spacing shrinks to fit, but an extremely long list (roughly 50+ documents) would still run off the page.
- **Dates are plain calendar dates:** the deadline and expiry dates are compared as `YYYY-MM-DD` with no time zone handling. A deadline in another format is rejected when the requirements file is loaded.
- **Encrypted PDF detection:** password-protected PDFs are recognised from the error the PDF library raises, so an unusual encryption type may be reported as "damaged" instead.
- **Performance:** the JavaScript bundle is about 585 kB (mostly pdf-lib), and the welcome animations may feel heavy on low-end devices. Users with "reduce motion" turned on get no animations.

## AI Tools Used

- Claude
- Gemini
- Chatgpt

## Most Useful Prompt

handle the errors according to the given instructions.
especially focus on the deadline. if everything is perfect and working accordingly then dont need to change or do anythiong.

## How to Run

```bash
npm install
npm run dev
```

Build for deployment: `npm run build` (output in `dist/`).

## License

MIT License
