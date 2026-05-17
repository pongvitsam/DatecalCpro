/**
 * DateCalc Pro — API client (Google Apps Script Web App)
 * POST uses application/x-www-form-urlencoded (reliable with GAS redirect).
 */

const DateCalcApi = (function () {
  const USER_ID_KEY = 'datecalc_user_id';

  function getUserId() {
    let id = DateCalcStorage.getItem(USER_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      DateCalcStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  }

  function getApiUrl() {
    const cfg = window.APP_CONFIG;
    if (!cfg || !cfg.apiUrl || cfg.apiUrl.includes('YOUR_DEPLOYMENT')) {
      throw new Error(
        'ยังไม่ได้ตั้งค่า API: แก้ docs/js/config.js ใส่ URL จาก GAS Deploy'
      );
    }
    return cfg.apiUrl.replace(/\/$/, '');
  }

  async function request(action, payload, method) {
    const apiUrl = getApiUrl();
    const body = Object.assign({ action: action, userId: getUserId() }, payload || {});

    if (method === 'GET') {
      const url = new URL(apiUrl);
      Object.keys(body).forEach(function (k) {
        if (body[k] !== undefined && body[k] !== null) {
          const val = body[k];
          url.searchParams.set(
            k,
            typeof val === 'object' ? JSON.stringify(val) : String(val)
          );
        }
      });
      const res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      });
      return parseResponse_(res);
    }

    const formBody = 'payload=' + encodeURIComponent(JSON.stringify(body));
    const res = await fetch(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: formBody
    });
    return parseResponse_(res);
  }

  async function parseResponse_(res) {
    const text = await res.text();

    if (!res.ok || text.trim().indexOf('<') === 0) {
      if (res.status === 404) {
        throw new Error(
          'GAS Web App ไม่พบ (404) — ไป Deploy > Manage deployments > สร้างเวอร์ชันใหม่ แล้วอัปเดต URL ใน config.js'
        );
      }
      throw new Error(
        'API ตอบกลับไม่ถูกต้อง (HTTP ' + res.status + ') — ลองเปิด URL ในเบราว์เซอร์แล้ว Authorize'
      );
    }

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
    }
  };
})();
