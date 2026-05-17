/**
 * DateCalc Pro — Google Apps Script API + Spreadsheet database
 * Secrets: Script Properties GEMINI_API_KEY (never expose to frontend)
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
    case 'analyzeAI':
      return jsonResponse_({ success: true, data: analyzeWithGemini_(params) });
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

/**
 * Run once in Apps Script editor: setGeminiApiKeyFromPrompt()
 * Stores key in Script Properties only (never in GitHub / frontend).
 */
function setGeminiApiKeyFromPrompt() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt(
    'Gemini API Key',
    'วาง API Key (จะเก็บใน Script Properties เท่านั้น):',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  var key = String(result.getResponseText() || '').trim();
  if (!key) {
    ui.alert('ไม่มีค่า API Key');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  ui.alert('บันทึก GEMINI_API_KEY เรียบร้อย');
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

function getGeminiApiKey_() {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY not configured. Set it in Script Properties (Project Settings).'
    );
  }
  return key;
}

function geminiErrorMessage_(code, body) {
  if (code === 429) {
    return (
      'โควต้า Gemini API เต็ม (429) — รอสักครู่แล้วลองใหม่ หรือตรวจสอบแผน/บิลลิ่งที่ ' +
      'https://ai.google.dev/gemini-api/docs/rate-limits'
    );
  }
  if (code === 403) {
    return 'API Key ไม่ถูกต้องหรือไม่มีสิทธิ์ใช้ Gemini (403)';
  }
  if (code === 400) {
    return 'คำขอไม่ถูกต้อง (400) — ลองย่อข้อความสัญญา';
  }
  try {
    var errJson = JSON.parse(body);
    if (errJson.error && errJson.error.message) {
      return 'Gemini: ' + errJson.error.message;
    }
  } catch (ignore) {}
  return 'Gemini API error (' + code + ')';
}

function analyzeWithGemini_(params) {
  var textInput = String((params && params.text) || '').trim();
  if (!textInput) {
    throw new Error('Missing text');
  }

  var apiKey = getGeminiApiKey_();
  var models = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  var currentDate = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');

  var payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'ข้อมูลบริบท: วันที่ปัจจุบันคือ ' +
              currentDate +
              '\n\nข้อความสัญญา: "' +
              textInput +
              '"\n\nจงดึงข้อมูลวันที่เริ่มต้น และระยะเวลาที่ต้องคำนวณออกมา'
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text:
            "คุณคือผู้ช่วยทางกฎหมายภาษาไทยที่เชี่ยวชาญการวิเคราะห์สัญญา หน้าที่ของคุณคือสกัด 'วันที่เริ่มต้น' และ 'ระยะเวลา' ออกจากข้อความ หากผู้ใช้ระบุคำว่า 'วันนี้' หรือ 'พรุ่งนี้' ให้ใช้วันที่ปัจจุบันที่แนบไปให้เพื่ออ้างอิง ถ้าสกัดข้อมูลได้ให้ hasDateInfo เป็น true ถ้าข้อความไม่มีข้อมูลเกี่ยวกับเวลาเลยให้เป็น false อธิบายผลการวิเคราะห์สั้นๆ ใน property 'explanation'"
        }
      ]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          hasDateInfo: { type: 'BOOLEAN' },
          startDate: { type: 'STRING' },
          operation: { type: 'STRING' },
          years: { type: 'INTEGER' },
          months: { type: 'INTEGER' },
          days: { type: 'INTEGER' },
          explanation: { type: 'STRING' }
        },
        required: ['hasDateInfo', 'explanation']
      }
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var lastError = 'Gemini API ไม่ตอบสนอง';
  var m;

  for (m = 0; m < models.length; m++) {
    var apiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      models[m] +
      ':generateContent?key=' +
      encodeURIComponent(apiKey);

    var response = UrlFetchApp.fetch(apiUrl, options);
    var code = response.getResponseCode();
    var body = response.getContentText();

    if (code >= 200 && code < 300) {
      var parsed = JSON.parse(body);
      if (
        parsed.candidates &&
        parsed.candidates[0] &&
        parsed.candidates[0].content &&
        parsed.candidates[0].content.parts &&
        parsed.candidates[0].content.parts[0]
      ) {
        return JSON.parse(parsed.candidates[0].content.parts[0].text);
      }
      lastError = 'Invalid Gemini response structure';
      continue;
    }

    lastError = geminiErrorMessage_(code, body);

    if (code !== 429) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
}
