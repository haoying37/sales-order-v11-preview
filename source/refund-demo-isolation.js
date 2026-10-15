(function () {
  // 原型演示专用缓存：正常业务入口不执行；每次切换/刷新演示重新初始化。
  if (new URLSearchParams(window.location.search).get('demoPreview') !== '1') return;
  function memoryStorage() {
    var values = new Map();
    return {
      get length() { return values.size; },
      key: function (index) { var key = Array.from(values.keys())[Number(index)]; return key == null ? null : key; },
      getItem: function (key) { key = String(key); return values.has(key) ? values.get(key) : null; },
      setItem: function (key, value) { values.set(String(key), String(value)); },
      removeItem: function (key) { values.delete(String(key)); },
      clear: function () { values.clear(); }
    };
  }
  ['localStorage', 'sessionStorage'].forEach(function (key) {
    Object.defineProperty(window, key, { configurable: false, value: memoryStorage() });
  });
})();
