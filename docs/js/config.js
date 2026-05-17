/**
 * แก้ URL หลัง Deploy GAS เป็น Web App (Anyone)
 * อย่าใส่ Gemini API key ในไฟล์นี้ — เก็บใน GAS Script Properties เท่านั้น
 */
window.APP_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
};
