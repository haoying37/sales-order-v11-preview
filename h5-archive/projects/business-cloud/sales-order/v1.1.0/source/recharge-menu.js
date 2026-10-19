// Prototype-only recharge entry: no business component, payment or ledger is invoked.
(function () {
  'use strict';
  var active = null;
  var labels = ['邀TA付款充值余额', '录入私下付款金额', '修改余额'];
  function close(restoreFocus) {
    if (!active) return;
    var current = active;
    active = null;
    current.trigger.setAttribute('aria-expanded', 'false');
    current.layer.remove();
    document.removeEventListener('click', current.outside, true);
    document.removeEventListener('focusin', current.focus, true);
    document.removeEventListener('keydown', current.key, true);
    document.removeEventListener('scroll', current.scroll, true);
    window.removeEventListener('resize', current.scroll);
    if (restoreFocus && current.trigger.isConnected) current.trigger.focus({ preventScroll: true });
  }
  function position(menu, trigger) {
    // Measure the full-size component before enabling its standard entry transition.
    menu.style.transition = 'none';
    menu.style.transform = 'none';
    var r = trigger.getBoundingClientRect(), m = menu.getBoundingClientRect();
    var w = window.innerWidth, h = window.innerHeight, gap = 4;
    var align = r.left + r.width / 2 > w / 2 ? 'end' : 'start';
    var left = align === 'end' ? r.right - m.width : r.left;
    if (left < gap || left + m.width > w - gap) {
      align = align === 'start' ? 'end' : 'start';
      left = align === 'end' ? r.right - m.width : r.left;
    }
    left = Math.max(gap, Math.min(left, w - gap - m.width));
    var candidates = [
      { left: left, top: r.bottom + gap, placement: 'bottom' },
      { left: left, top: r.top - gap - m.height, placement: 'top' },
      { left: r.right + gap, top: Math.max(gap, Math.min(r.top, h - gap - m.height)), placement: 'right' },
      { left: r.left - gap - m.width, top: Math.max(gap, Math.min(r.top, h - gap - m.height)), placement: 'left' }
    ];
    var fit = candidates.find(function (item) {
      return item.left >= gap && item.top >= gap && item.left + m.width <= w - gap && item.top + m.height <= h - gap;
    });
    if (!fit) return false;
    menu.style.left = fit.left + 'px'; menu.style.top = fit.top + 'px';
    menu.dataset.placement = fit.placement; menu.dataset.align = align;
    menu.style.removeProperty('transition'); menu.style.removeProperty('transform');
    return true;
  }
  function open(trigger, onChoose) {
    if (active && active.trigger === trigger) { close(false); return; }
    close(false);
    var layer = document.createElement('div');
    layer.className = 'order-recharge-layer';
    layer.innerHTML = '<div id="order-recharge-menu" class="popmenu popmenu--action" data-component="popmenu" data-variant-name="action" data-state="closed" data-placement="bottom" data-align="start" role="menu" aria-label="充值操作"><div class="popmenu__list">' + labels.map(function (label, index) {
      return '<button type="button" class="popmenu__item" role="menuitem" data-recharge-action="' + index + '"><span class="popmenu__item-text">' + label + '</span></button>';
    }).join('') + '</div></div>';
    document.body.appendChild(layer);
    var menu = layer.firstElementChild;
    if (!position(menu, trigger)) { layer.remove(); return; }
    var current = { layer: layer, menu: menu, trigger: trigger };
    current.outside = function (event) { if (!layer.contains(event.target) && !trigger.contains(event.target)) close(false); };
    current.focus = current.outside;
    current.scroll = function () { close(false); };
    current.key = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
      if (!layer.contains(event.target) || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      var items = Array.from(menu.querySelectorAll('button'));
      var index = items.indexOf(document.activeElement);
      var next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus({ preventScroll: true });
    };
    menu.addEventListener('click', function (event) {
      if (!event.target.closest('[data-recharge-action]')) return;
      close(true);
      onChoose();
    });
    active = current;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', 'order-recharge-menu');
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', current.outside, true);
    document.addEventListener('focusin', current.focus, true);
    document.addEventListener('keydown', current.key, true);
    document.addEventListener('scroll', current.scroll, true);
    window.addEventListener('resize', current.scroll);
    window.requestAnimationFrame(function () {
      if (active !== current) return;
      menu.dataset.state = 'open';
      menu.querySelector('button').focus({ preventScroll: true });
    });
  }
  window.WegoRechargeMenu = { open: open, close: close };
}());
