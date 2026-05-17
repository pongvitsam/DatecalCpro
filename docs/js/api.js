/**
 * DateCalc Pro — API client (Google Apps Script Web App)
 * Uses text/plain POST to avoid CORS preflight issues with GAS.
 */

const DateCalcApi = (function () {
  const USER_ID_KEY = 'datecalc_user_id';

  function getUserId() {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  }

  function getApiUrl() {
    const cfg = window.APP_CONFIG;
    if (!cfg || !cfg.apiUrl || cfg.apiUrl.includes('YOUR_DEPLOYMENT')) {
      throw new Error(
        'ยังไม่ได้ตั้งค่า API: คัดลอก docs/js/config.example.js เป็น config.js แล้วใส่ URL จาก GAS Deploy'
      );
    }
    return cfg.apiUrl;
  }

  async function request(action, payload, method) {
    const apiUrl = getApiUrl();
    const body = Object.assign({ action: action, userId: getUserId() }, payload || {});

    if (method === 'GET') {
      const url = new URL(apiUrl);
      Object.keys(body).forEach(function (k) {
        if (body[k] !== undefined && body[k] !== null) {
          url.searchParams.set(k, typeof body[k] === 'object' ? JSON.stringify(body[k]) : String(body[k]));
        }
      });
      const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
      return parseResponse_(res);
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    return parseResponse_(res);
  }

  async function parseResponse_(res) {
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid API response');
    }
    if (!json.success) {
      throw new Error(json.error || 'API request failed');
    }
    return json.data;
  }

  return {
    getUserId: getUserId,
    ping: function () {
      return request('ping', {}, 'GET');
    },
    listHistory: function () {
      return request('listHistory', {}, 'GET');
    },
    saveHistory: function (item) {
      return request('saveHistory', { item: item }, 'POST');
    },
    deleteHistory: function (id) {
      return request('deleteHistory', { id: id }, 'POST');
    },
    clearHistory: function () {
      return request('clearHistory', {}, 'POST');
    },
    analyzeAI: function (text) {
      return request('analyzeAI', { text: text }, 'POST');
    }
  };
})();
