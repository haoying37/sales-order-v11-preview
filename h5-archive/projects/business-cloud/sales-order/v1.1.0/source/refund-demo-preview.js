(function () {
  // 原型演示工具：仅通过URL白名单打开独立iframe，不提供页面内切换，不定义业务校验额度。
  var examples = {
    normal: { label: '正常完整流程', query: '?demoPreview=1' },
    quantity: { label: '退货同步历史订单：数量超退', query: '?state=refund-sync-quantity&syncPreview=1&demoPreview=1' },
    amount: { label: '退货同步历史订单：金额超限', query: '?state=refund-sync-amount&syncPreview=1&demoPreview=1' },
    many: { label: '退货同步历史订单：多商品异常', query: '?state=refund-sync-many&syncPreview=1&demoPreview=1' }
  };
  var selected = '';
  var frame = document.getElementById('refund-demo-frame');
  function selectExample(mode) {
    if (!Object.prototype.hasOwnProperty.call(examples, mode)) mode = 'normal';
    if (selected === mode) return;
    selected = mode;
    frame.src = './sales-order.html' + examples[mode].query;
    frame.title = '销售开单演示 · ' + examples[mode].label;
    var url = new URL(window.location.href);
    url.searchParams.set('demo', mode);
    window.history.replaceState(null, '', url.href);
  }
  var defaultMode = document.body.dataset.demo || 'quantity';
  selectExample(new URLSearchParams(window.location.search).get('demo') || defaultMode);
})();
