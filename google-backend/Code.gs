const SCHEMA = {
  recipes: ["id","title","servings","ingredients_json","instructions","front_file_id","back_file_id","source","created_at","updated_at","deleted_at"],
  pantry: ["id","name","quantity","unit","category","barcode","purchase_id","expires_at","created_at","updated_at","deleted_at"],
  shopping: ["id","name","quantity","unit","category","recipe_id","in_pantry","checked","created_at","updated_at","deleted_at"],
  plan: ["id","week_start","recipe_id","selected_date","status","created_at","updated_at","deleted_at"],
  leftovers: ["id","recipe_id","cooked_at","servings_remaining","notes","created_at","updated_at","deleted_at"],
  purchases: ["id","store","purchased_at","total","receipt_file_id","items_json","created_at","updated_at","deleted_at"]
};

function setupBackend() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty("SPREADSHEET_ID");
  let rootFolderId = props.getProperty("ROOT_FOLDER_ID");
  let apiKey = props.getProperty("API_KEY");

  if (!spreadsheetId) {
    const ss = SpreadsheetApp.create("myApron Data");
    spreadsheetId = ss.getId();
    props.setProperty("SPREADSHEET_ID", spreadsheetId);
  }

  if (!rootFolderId) {
    const folder = DriveApp.createFolder("myApron");
    rootFolderId = folder.getId();
    props.setProperty("ROOT_FOLDER_ID", rootFolderId);
  }

  if (!apiKey) {
    apiKey = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, "");
    props.setProperty("API_KEY", apiKey);
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  Object.keys(SCHEMA).forEach(name => ensureSheet_(ss, name, SCHEMA[name]));
  ensureFolder_(DriveApp.getFolderById(rootFolderId), "Recipes");
  ensureFolder_(DriveApp.getFolderById(rootFolderId), "Receipts");

  Logger.log(JSON.stringify({
    spreadsheetId,
    spreadsheetUrl: ss.getUrl(),
    rootFolderId,
    apiKey
  }, null, 2));
}

function doGet(e) {
  try {
    authorize_(e && e.parameter ? e.parameter.key : null);
    const action = (e && e.parameter && e.parameter.action) || "recipes.list";
    if (action === "health") return json_({ok:true, service:"myApron-google-backend", version:"1"});
    if (action === "recipes.list") return json_({ok:true, recipes:listRows_("recipes").map(deserializeRecipe_)});
    if (action === "pantry.list") return json_({ok:true, pantry:listRows_("pantry")});
    if (action === "shopping.list") return json_({ok:true, shopping:listRows_("shopping")});
    if (action === "plan.list") return json_({ok:true, plan:listRows_("plan")});
    if (action === "leftovers.list") return json_({ok:true, leftovers:listRows_("leftovers")});
    if (action === "purchases.list") return json_({ok:true, purchases:listRows_("purchases")});
    return json_({ok:false, error:"Unknown action"});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    authorize_(body.key);
    const action = body.action;

    if (action === "recipe.upsert") return json_({ok:true, recipe:upsertRecipe_(body.recipe || {})});
    if (action === "recipe.delete") return json_({ok:true, recipe:softDelete_("recipes", body.id)});
    if (action === "pantry.upsert") return json_({ok:true, pantry:upsertGeneric_("pantry", body.item || {})});
    if (action === "shopping.upsert") return json_({ok:true, shopping:upsertGeneric_("shopping", body.item || {})});
    if (action === "plan.upsert") return json_({ok:true, plan:upsertGeneric_("plan", body.item || {})});
    if (action === "leftover.upsert") return json_({ok:true, leftover:upsertGeneric_("leftovers", body.item || {})});
    if (action === "purchase.upsert") return json_({ok:true, purchase:upsertPurchase_(body.purchase || {})});
    if (action === "image.getUrl") return json_({ok:true, url:getFileUrl_(body.fileId)});

    return json_({ok:false, error:"Unknown action"});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function upsertRecipe_(recipe) {
  const now = new Date().toISOString();
  const id = recipe.id || Utilities.getUuid();
  const current = findRowById_("recipes", id);
  let frontFileId = current ? current.front_file_id : "";
  let backFileId = current ? current.back_file_id : "";

  if (recipe.front && recipe.front.base64) frontFileId = saveRecipeImage_(id, "front", recipe.front);
  if (recipe.back && recipe.back.base64) backFileId = saveRecipeImage_(id, "back", recipe.back);

  const row = {
    id,
    title: String(recipe.title || "Untitled recipe"),
    servings: Number(recipe.servings || 2),
    ingredients_json: JSON.stringify(recipe.ingredients || []),
    instructions: String(recipe.instructions || ""),
    front_file_id: frontFileId || "",
    back_file_id: backFileId || "",
    source: String(recipe.source || ""),
    created_at: current && current.created_at ? current.created_at : now,
    updated_at: now,
    deleted_at: ""
  };
  writeRow_("recipes", row);
  return deserializeRecipe_(row);
}

function upsertPurchase_(purchase) {
  const copy = Object.assign({}, purchase);
  if (copy.receipt && copy.receipt.base64) {
    copy.receipt_file_id = saveReceipt_(copy.id || Utilities.getUuid(), copy.receipt);
  }
  copy.items_json = JSON.stringify(copy.items || []);
  delete copy.items;
  delete copy.receipt;
  return upsertGeneric_("purchases", copy);
}

function upsertGeneric_(sheetName, item) {
  const now = new Date().toISOString();
  const id = item.id || Utilities.getUuid();
  const current = findRowById_(sheetName, id);
  const row = Object.assign({}, current || {}, item, {
    id,
    created_at: current && current.created_at ? current.created_at : now,
    updated_at: now,
    deleted_at: ""
  });
  writeRow_(sheetName, row);
  return row;
}

function softDelete_(sheetName, id) {
  const row = findRowById_(sheetName, id);
  if (!row) throw new Error("Record not found");
  row.deleted_at = new Date().toISOString();
  row.updated_at = row.deleted_at;
  writeRow_(sheetName, row);
  return row;
}

function saveRecipeImage_(recipeId, side, image) {
  const root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("ROOT_FOLDER_ID"));
  const recipes = ensureFolder_(root, "Recipes");
  const folder = ensureFolder_(recipes, recipeId);
  removeFilesNamed_(folder, side + ".jpg");
  const bytes = Utilities.base64Decode(image.base64);
  const blob = Utilities.newBlob(bytes, image.mimeType || "image/jpeg", side + ".jpg");
  return folder.createFile(blob).getId();
}

function saveReceipt_(purchaseId, image) {
  const root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("ROOT_FOLDER_ID"));
  const receipts = ensureFolder_(root, "Receipts");
  const bytes = Utilities.base64Decode(image.base64);
  const name = purchaseId + ".jpg";
  removeFilesNamed_(receipts, name);
  return receipts.createFile(Utilities.newBlob(bytes, image.mimeType || "image/jpeg", name)).getId();
}

function getFileUrl_(fileId) {
  if (!fileId) return "";
  return "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(fileId);
}

function listRows_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(r => r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  }).filter(r => !r.deleted_at);
}

function findRowById_(sheetName, id) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      const obj = {};
      headers.forEach((h, j) => obj[h] = values[i][j]);
      obj.__rowNumber = i + 1;
      return obj;
    }
  }
  return null;
}

function writeRow_(sheetName, obj) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const existing = findRowById_(sheetName, obj.id);
  const values = headers.map(h => obj[h] === undefined || obj[h] === null ? "" : obj[h]);
  if (existing) sheet.getRange(existing.__rowNumber,1,1,headers.length).setValues([values]);
  else sheet.appendRow(values);
}

function getSheet_(name) {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Backend not initialized. Run setupBackend().");
  const sheet = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet) throw new Error("Missing sheet: " + name);
  return sheet;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
  else {
    const current = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    headers.forEach((h, i) => { if (current[i] !== h) sheet.getRange(1,i+1).setValue(h); });
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function ensureFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function removeFilesNamed_(folder, name) {
  const it = folder.getFilesByName(name);
  while (it.hasNext()) it.next().setTrashed(true);
}

function deserializeRecipe_(row) {
  const r = Object.assign({}, row);
  try { r.ingredients = JSON.parse(r.ingredients_json || "[]"); } catch (_) { r.ingredients = []; }
  delete r.ingredients_json;
  r.front_url = getFileUrl_(r.front_file_id);
  r.back_url = getFileUrl_(r.back_file_id);
  delete r.__rowNumber;
  return r;
}

function parseBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
  return JSON.parse(raw);
}

function authorize_(key) {
  const expected = PropertiesService.getScriptProperties().getProperty("API_KEY");
  if (!expected) throw new Error("Backend not initialized. Run setupBackend().");
  if (!key || key !== expected) throw new Error("Unauthorized");
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
