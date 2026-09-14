# myApron Google backend

This Apps Script project provides the persistent backend for myApron.

## Storage

- Google Sheets stores structured records.
- Google Drive stores recipe front/back images and receipt images.
- Apps Script is the HTTP API.
- The web app should continue to use browser local storage/cache for fast UI response, then sync with this API.

## First-time setup

1. Create a new standalone Google Apps Script project.
2. Copy `Code.gs` and `appsscript.json` into the project.
3. Run `setupBackend()` once from the Apps Script editor and approve the requested Sheets/Drive permissions.
4. Open **Executions / Logs** and copy the values printed by `setupBackend()`:
   - `spreadsheetUrl`
   - `rootFolderId`
   - `apiKey`
5. Deploy the script as a **Web app**.
   - Execute as: **Me**
   - Who has access: choose the access level required for your myApron client/import workflow.
6. Copy the deployed `/exec` URL. Do not use the `/dev` test URL for production.

The `API_KEY` is generated during `setupBackend()` and stored in Apps Script Script Properties, not in source control.

## Created Sheets

`setupBackend()` creates these tabs:

- `recipes`
- `pantry`
- `shopping`
- `plan`
- `leftovers`
- `purchases`

## Drive layout

```text
myApron/
  Recipes/
    <recipe UUID>/
      front.jpg
      back.jpg
  Receipts/
    <purchase UUID>.jpg
```

## API

Requests use JSON. Authentication is currently an API key supplied as `key`.

### Health

```text
GET <WEB_APP_URL>?action=health&key=<API_KEY>
```

### List recipes

```text
GET <WEB_APP_URL>?action=recipes.list&key=<API_KEY>
```

### Upsert recipe

```json
{
  "key": "<API_KEY>",
  "action": "recipe.upsert",
  "recipe": {
    "id": "optional-existing-uuid",
    "title": "Honey Mustard Chicken & Farro Salad",
    "servings": 2,
    "ingredients": [
      {"quantity":"1/2 cup","name":"Semi-Pearled Farro","aisle":"Pantry"}
    ],
    "instructions": "...",
    "source": "Blue Apron scan",
    "front": {
      "mimeType": "image/jpeg",
      "base64": "..."
    },
    "back": {
      "mimeType": "image/jpeg",
      "base64": "..."
    }
  }
}
```

If `id` is omitted, the backend assigns a UUID. Reusing the same `id` updates the existing recipe rather than making a duplicate.

### Other list actions

- `pantry.list`
- `shopping.list`
- `plan.list`
- `leftovers.list`
- `purchases.list`

### Other write actions

- `pantry.upsert` with `item`
- `shopping.upsert` with `item`
- `plan.upsert` with `item`
- `leftover.upsert` with `item`
- `purchase.upsert` with `purchase`
- `recipe.delete` with `id` (soft delete)

## Migration plan

1. Deploy and validate the Apps Script backend.
2. Import the scanned Blue Apron cards into this backend.
3. Add a server-side proxy in myApron so the Apps Script API key is never exposed to the browser.
4. Make myApron load from local cache immediately and synchronize with the Google backend.
5. Migrate any existing D1/R2 recipes, then remove the old storage path after verification.
