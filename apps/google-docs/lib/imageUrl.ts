// Inline-image URL validation, shared by insertImage and replaceImage. Google
// fetches the image server-side from the URL anonymously — so the URL must be
// publicly reachable with no auth, and the API enforces a 2kB URI cap. We
// pre-validate the cheap, deterministic constraints (length, scheme) here; the
// byte-level format/size checks (PNG/JPEG/GIF, <50MB, <=25MP) happen server-side
// and surface through googleDocsFetch's image-error mapping.

/** Throw if `url` can't be a public image source Google could fetch. */
export function validateImageUrl(url: string, opName: string): void {
  if (url.length > 2000) {
    throw new Error(
      `Google Docs ${opName}: image URL is ${url.length} chars, over the 2kB limit Google enforces on image URIs.`,
    );
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `Google Docs ${opName}: imageUrl must be a public http(s) URL Google can fetch anonymously (no login, no cookies).`,
    );
  }
}
