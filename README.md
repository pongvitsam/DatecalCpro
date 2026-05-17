# DatecalCpro

ระบบคำนวณวันที่ **DateCalc Pro** — Frontend บน GitHub Pages, ฐานข้อมูลประวัติผ่าน Google Apps Script

## โครงสร้าง

| โฟลเดอร์ | 用途 |
|----------|------|
| [`docs/`](docs/) | ไฟล์สำหรับ GitHub Pages |
| [`gas/`](gas/) | Google Apps Script (API + Spreadsheet DB) |

## ฟีเจอร์

- แดชบอร์ด + นาฬิกาไทย
- หาอดีต / อนาคต (บวก/ลบ ปี-เดือน-วัน, inclusive/exclusive)
- หาระยะห่างระหว่างวัน
- ประวัติ CRUD บน Google Spreadsheet
- ส่งออก CSV
- โหมดสว่าง/มืด

## ติดตั้ง

### 1. Push โค้ด GAS

```bash
npm install -g @google/clasp
clasp login
cd DatecalCpro
clasp push
```

Script ID: `16yXGVTwH7JgCH9j8Z9aO0oa9g4o20B6EQ42jAoeuLr3MM5cqqx4oIOqr`

### 2. Deploy Web App

1. GAS Editor → **Deploy** → **New deployment** → Type: **Web app**
2. Execute as: **Me** | Who has access: **Anyone**
3. ใส่ URL ใน [`docs/js/config.js`](docs/js/config.js)

### 3. GitHub Pages

Settings → Pages → Source: **GitHub Actions** (หรือ branch `main` / folder `docs`)

เปิด: https://pongvitsam.github.io/DatecalCpro/

## ทดสอบ API

`https://script.google.com/macros/s/YOUR_ID/exec?action=ping`
