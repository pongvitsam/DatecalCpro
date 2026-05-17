/**
 * Safe storage — works when Tracking Prevention blocks localStorage (Edge/Safari).
 */
const DateCalcStorage = (function () {
  const memory = {};

  function get(store, key) {
    try {
      return store.getItem(key);
    } catch (e) {
      return memory[key] || null;
    }
  }

  function set(store, key, value) {
    try {
      store.setItem(key, value);
    } catch (e) {
      memory[key] = value;
    }
  }

  return {
    getItem: function (key) {
      return get(localStorage, key) || get(sessionStorage, key);
    },
    setItem: function (key, value) {
      set(localStorage, key, value);
      set(sessionStorage, key, value);
    }
  };
})();
