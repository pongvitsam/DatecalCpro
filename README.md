# DatecalCpro

ระบบคำนวณวันที่ **DateCalc Pro** — Frontend บน GitHub Pages, ฐานข้อมูลและ AI ผ่าน Google Apps Script

## โครงสร้าง

| โฟลเดอร์ | 用途 |
|----------|------|
| [`docs/`](docs/) | ไฟล์สำหรับ GitHub Pages (`index.html`, CSS, JS) |
| [`gas/`](gas/) | Google Apps Script (API + Spreadsheet DB + Gemini proxy) |

## ฟีเจอร์

- แดชบอร์ด + นาฬิกาไทย
- หาอดีต / อนาคต (บวก/ลบ ปี-เดือน-วัน, inclusive/exclusive)
- หาระยะห่างระหว่างวัน
- AI วิเคราะห์สัญญา (Gemini ผ่าน GAS — **ไม่เปิดเผย API key ในเว็บ**)
- ประวัติ CRUD บน Google Spreadsheet
- ส่งออก CSV
- โหมดสว่าง/มืด

## ติดตั้ง (ครั้งแรก)

### 1. Push โค้ด GAS

```bash
npm install -g @google/clasp
clasp login
cd DatecalCpro
clasp push
```

Script ID: `16yXGVTwH7JgCH9j8Z9aO0oa9g4o20B6EQ42jAoeuLr3MM5cqqx4oIOqr`

### 2. ตั้ง Gemini API Key (ปลอดภัย)

**อย่าใส่ API key ใน `config.js` หรือ commit ขึ้น GitHub**

เลือกวิธีใดวิธีหนึ่ง:

1. **Apps Script Editor** → Project Settings → Script properties → Add property  
   - Name: `GEMINI_API_KEY`  
   - Value: คีย์ของคุณ  

2. รันฟังก์ชัน `setGeminiApiKeyFromPrompt()` ใน Editor (เมนู Run)

3. ถ้ามี clasp:  
   `clasp setting script GEMINI_API_KEY "YOUR_KEY"`

### 3. Deploy Web App

1. GAS Editor → **Deploy** → **New deployment** → Type: **Web app**
2. Execute as: **Me**
3. Who has access: **Anyone**
4. คัดลอก URL ลงท้าย `/exec`

แก้ [`docs/js/config.js`](docs/js/config.js):

```javascript
window.APP_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/xxxx/exec'
};
```

### 4. เปิด GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` → Folder: **`/docs`**
4. เปิด `https://pongvitsam.github.io/DatecalCpro/`

## ความปลอดภัยของ API Key

| ที่เก็บ | ปลอดภัย? |
|---------|-----------|
| GAS Script Properties | ใช่ — ฝั่ง server เท่านั้น |
| `docs/js/config.js` | ใส่ได้แค่ **URL ของ Web App** ไม่ใส่ Gemini key |
| HTML / GitHub public | ห้ามใส่ API key |

เบราว์เซอร์เรียก `analyzeAI` → GAS อ่าน key จาก Properties → เรียก Gemini → ส่ง JSON กลับ

## ทดสอบ API

หลัง Deploy เปิดในเบราว์เซอร์:

`https://script.google.com/macros/s/YOUR_ID/exec?action=ping`

ควรได้ `{"success":true,"data":{"ok":true,...}}`

## License

MIT (ตามต้องการของเจ้าของ repo)
