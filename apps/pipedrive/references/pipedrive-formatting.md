# Pipedrive text formatting (notes and activity notes)

Free-text bodies on notes and activities accept a small, sanitized subset of **HTML**. Plain text is always fine — HTML is optional.

## Notes — `createNote` / `updateNote` `content`

The note `content` is HTML-formatted and sanitized on the back end. Per the Pipedrive Notes API: "Notes are pieces of textual (HTML-formatted) information…" and "The content of the note in HTML format. Subject to sanitization on the back-end." ([Notes API](https://developers.pipedrive.com/docs/api/v1/Notes)).

Maximum note size is approximately 100,000 characters (~100KB per note). Same source.

## Activity notes — `createActivity` / `updateActivity` `note`

The activity `note` is also HTML-formatted, documented as "(HTML format)" on the [Activities API](https://developers.pipedrive.com/docs/api/v1/Activities).

## Supported subset and sanitization

The back end strips anything outside a small allowlist, so only basic structural tags survive. In practice (observed against the live API and reported by Pipedrive's developer community) the supported tags are paragraphs `<p>`, line breaks `<br>`, bold `<b>`, italics `<i>`, lists `<ul>`/`<li>`, and links `<a>`; inline CSS and most other tags/attributes are removed on save, and links are rewritten with `rel="noopener noreferrer" target="_blank"`. HTML entities (e.g. `&amp;`) are decoded.

Because sanitization is strict and silent, test specific markup before relying on it — unsupported tags are dropped without an error.
