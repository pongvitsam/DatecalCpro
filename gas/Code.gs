/**
 * DateCalc Pro — Google Apps Script API + Spreadsheet database
 */

var HISTORY_SHEET = 'History';
var HISTORY_HEADERS = ['id', 'userId', 'type', 'label', 'detail', 'result', 'timestamp'];

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
  var params = method === 'POST' ? parsePostBody_(e) : (e && e.parameter ? e.parameter : {});

  if (params.item && typeof params.item === 'string') {
    try {
      params.item = JSON.parse(params.item);
    } catch (itemErr) {
      /* keep string */
    }
  }

  var action = String(params.action || '').trim();
  if (!action) {
    return jsonResponse_({
      success: true,
      data: {
        ok: true,
        message: 'DateCalc Pro API — use ?action=ping'
      }
    });
  }

  switch (action) {
    case 'ping':
      return jsonResponse_({ success: true, data: { ok: true, version: '1.0.0' } });
    case 'listHistory':
      return jsonResponse_({ success: true, data: listHistory_(requireUserId_(params)) });
    case 'saveHistory':
      return jsonResponse_({ success: true, data: saveHistory_(params) });
    case 'deleteHistory':
      return jsonResponse_({ success: true, data: deleteHistory_(params) });
    case 'clearHistory':
      return jsonResponse_({ success: true, data: clearHistory_(requireUserId_(params)) });
    default:
      return jsonResponse_({ success: false, error: 'Unknown action: ' + action });
  }
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function parsePostBody_(e) {
  if (!e) {
    return {};
  }

  if (e.parameter && e.parameter.payload) {
    try {
      return JSON.parse(String(e.parameter.payload));
    } catch (payloadErr) {
      return {};
    }
  }

  if (!e.postData || !e.postData.contents) {
    return e.parameter || {};
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (parseErr) {
    return e.parameter || {};
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function requireUserId_(params) {
  var userId = String((params && params.userId) || '').trim();
  if (!userId) {
    throw new Error('Missing userId');
  }
  return userId;
}

function ensureDatabase_() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SPREADSHEET_ID');
  var ss;

  if (sheetId) {
    try {
      ss = SpreadsheetApp.openById(sheetId);
      return ss;
    } catch (openErr) {
      sheetId = null;
    }
  }

  ss = SpreadsheetApp.create('DateCalcPro_Database');
  sheetId = ss.getId();
  props.setProperty('SPREADSHEET_ID', sheetId);

  var sheet = ss.getSheets()[0];
  sheet.setName(HISTORY_SHEET);
  sheet.getRange(1, 1, 1, HISTORY_HEADERS.length).setValues([HISTORY_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('@');

  return ss;
}

function getHistorySheet_() {
  var ss = ensureDatabase_();
  var sheet = ss.getSheetByName(HISTORY_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(HISTORY_SHEET);
    sheet.getRange(1, 1, 1, HISTORY_HEADERS.length).setValues([HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowToItem_(row) {
  return {
    id: String(row[0] || ''),
    userId: String(row[1] || ''),
    type: String(row[2] || ''),
    label: String(row[3] || ''),
    detail: String(row[4] || ''),
    result: String(row[5] || ''),
    timestamp: String(row[6] || '')
  };
}

function listHistory_(userId) {
  var sheet = getHistorySheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  var values = sheet.getRange(2, 1, lastRow, HISTORY_HEADERS.length).getValues();
  var items = [];

  for (var i = 0; i < values.length; i++) {
    var item = rowToItem_(values[i]);
    if (item.userId === userId) {
      items.push(item);
    }
  }

  items.sort(function (a, b) {
    return String(b.timestamp).localeCompare(String(a.timestamp));
  });

  return items;
}

function saveHistory_(params) {
  var userId = requireUserId_(params);
  var item = params.item;
  if (!item || typeof item !== 'object') {
    throw new Error('Missing item');
  }

  var id = String(item.id || Utilities.getUuid());
  var type = String(item.type || 'shift');
  var label = String(item.label || '');
  var detail = String(item.detail || '');
  var result = String(item.result || '');
  var timestamp = String(item.timestamp || new Date().toISOString());

  var sheet = getHistorySheet_();
  sheet.appendRow([id, userId, type, label, detail, result, timestamp]);

  return { id: id, saved: true };
}

function deleteHistory_(params) {
  var userId = requireUserId_(params);
  var id = String(params.id || '').trim();
  if (!id) {
    throw new Error('Missing id');
  }

  var sheet = getHistorySheet_();
  var lastRow = sheet.getLastRow();
  for (var r = lastRow; r >= 2; r--) {
    var rowId = String(sheet.getRange(r, 1).getValue());
    var rowUser = String(sheet.getRange(r, 2).getValue());
    if (rowId === id && rowUser === userId) {
      sheet.deleteRow(r);
      return { deleted: true, id: id };
    }
  }

  return { deleted: false, id: id };
}

function clearHistory_(userId) {
  var sheet = getHistorySheet_();
  var lastRow = sheet.getLastRow();
  var removed = 0;

  for (var r = lastRow; r >= 2; r--) {
    var rowUser = String(sheet.getRange(r, 2).getValue());
    if (rowUser === userId) {
      sheet.deleteRow(r);
      removed++;
    }
  }

  return { cleared: true, removed: removed };
}
