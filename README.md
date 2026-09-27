# Emily Duchenne's website

Plain static HTML/CSS/JS — no build step. Videos pull automatically from
Instagram via Behold.so; articles are added manually below.

## Running it locally

```
npx serve .
```

(or `python3 -m http.server`), then open the URL it prints.

## Adding an article

Open `articles.json` and add a new entry at the top of the array:

```json
{
  "title": "Headline of the piece",
  "sub": "One-line standfirst or description",
  "outlet": "FT Weekend",
  "date": "2026-09-27",
  "image": "assets/articles/your-image.jpg",
  "url": "https://example.com/the-article"
}
```

- `date` controls sort order (newest first) — use `YYYY-MM-DD`.
- `image` should point to a file in `assets/articles/` — add the image there first.
- `url` is where clicking the card sends the reader.

Commit the change (edit the file directly on GitHub, or via git) and it goes live on next deploy.

## Videos

Videos pull automatically from Instagram via Behold.so — nothing to update here manually. See `js/config.js` for the feed ID.
