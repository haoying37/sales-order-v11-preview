window.wegoPreviewProjects = [
  {
    "project": "sales-order",
    "projectSlug": "sales-order",
    "title": "销售开单",
    "version": "v1.1.0",
    "productLine": "business-cloud",
    "preview": {
      "defaultMode": "tablet",
      "tablet": {
        "label": "小新 Pad Pro 2022",
        "width": 1280,
        "height": 768,
        "resolution": "2560×1536"
      }
    },
    "pages": [
      {
        "name": "sales-order",
        "title": "收银开单常规完整链路",
        "path": "projects/business-cloud/sales-order/v1.1.0/pages/sales-order.html"
      },
      {
        "name": "refund-sync-preview",
        "title": "数量超限",
        "scenario": "数量超限",
        "path": "projects/business-cloud/sales-order/v1.1.0/pages/refund-sync-preview.html",
        "view": "无法同步历史订单演示"
      },
      {
        "name": "refund-sync-amount-preview",
        "title": "金额超限",
        "view": "无法同步历史订单演示",
        "scenario": "金额超限",
        "path": "projects/business-cloud/sales-order/v1.1.0/pages/refund-sync-amount-preview.html"
      },
      {
        "name": "courier-empty-preview",
        "title": "无快递面单、无打印机",
        "view": "快递打单演示",
        "scenario": "无快递面单、无打印机",
        "path": "projects/business-cloud/sales-order/v1.1.0/pages/courier-empty-preview.html"
      },
      {
        "name": "continue-last-order-preview",
        "title": "继续上一次开单提示",
        "view": "开单入口演示",
        "scenario": "继续上一次开单提示",
        "path": "projects/business-cloud/sales-order/v1.1.0/pages/continue-last-order-preview.html"
      }
    ]
  }
];
