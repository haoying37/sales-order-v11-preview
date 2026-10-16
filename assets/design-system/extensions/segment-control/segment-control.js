/* seg_32 H5 runtime. No business state, DOM replacement or scrolling. */
(function (global) {
  'use strict';
  var bindings = new WeakMap();
  function bindOne(root) {
    if (bindings.has(root)) return bindings.get(root);
    var indicator = root.querySelector(':scope > .segment-control__indicator');
    if (!indicator) throw new Error('segment-control requires an indicator');
    var disposed = false;
    var observed = new Set();
    function items() { return Array.from(root.querySelectorAll(':scope > .segment-control__item')); }
    function groupDisabled() { return root.getAttribute('aria-disabled') === 'true'; }
    function measure() {
      if (disposed) return;
      var selected = items().find(function (item) { return item.getAttribute('aria-checked') === 'true'; });
      indicator.hidden = !selected || !root.getClientRects().length;
      if (indicator.hidden) return;
      // offset coordinates stay correct when an outer preview frame is scaled.
      indicator.style.width = selected.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + selected.offsetLeft + 'px)';
    }
    var observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    function update() {
      if (disposed) return;
      var list = items();
      var selected = list.find(function (item) { return item.getAttribute('aria-checked') === 'true' && !item.disabled; });
      selected = selected || list.find(function (item) { return !item.disabled; });
      list.forEach(function (item) {
        item.setAttribute('aria-checked', String(item === selected));
        item.tabIndex = item === selected && !groupDisabled() ? 0 : -1;
      });
      if (observer) {
        observed.forEach(function (item) { if (!list.includes(item)) { observer.unobserve(item); observed.delete(item); } });
        list.forEach(function (item) { if (!observed.has(item)) { observer.observe(item); observed.add(item); } });
      }
      measure();
    }
    function setIndex(index, options) {
      if (disposed || groupDisabled()) return false;
      var list = items();
      var target = list[index];
      if (!Number.isInteger(index) || !target || target.disabled) return false;
      var repeated = target.getAttribute('aria-checked') === 'true';
      list.forEach(function (item) { item.setAttribute('aria-checked', String(item === target)); });
      update();
      if (options && options.focus) target.focus({ preventScroll: true });
      if (!options || !options.silent) root.dispatchEvent(new CustomEvent(repeated ? 'segment-reclick' : 'segment-change', {
        bubbles: true, detail: { index: index, value: target.dataset.value || '', label: target.textContent.trim() }
      }));
      return true;
    }
    function click(event) {
      var target = event.target.closest('.segment-control__item');
      var index = items().indexOf(target);
      if (index >= 0) setIndex(index);
    }
    function keydown(event) {
      if (groupDisabled() || event.altKey || event.ctrlKey || event.metaKey) return;
      var list = items();
      var current = list.indexOf(event.target.closest('.segment-control__item'));
      if (current < 0) return;
      var available = list.map(function (item, index) { return item.disabled ? -1 : index; }).filter(function (index) { return index >= 0; });
      if (!available.length) return;
      var position = available.indexOf(current);
      var rtl = getComputedStyle(root).direction === 'rtl';
      var step = 0;
      if (event.key === 'ArrowRight') step = rtl ? -1 : 1;
      if (event.key === 'ArrowLeft') step = rtl ? 1 : -1;
      if (event.key === 'ArrowDown') step = 1;
      if (event.key === 'ArrowUp') step = -1;
      var next;
      if (step) next = available[(position + step + available.length) % available.length];
      else if (event.key === 'Home') next = available[0];
      else if (event.key === 'End') next = available[available.length - 1];
      else return; // Native buttons supply Enter / Space click semantics.
      event.preventDefault();
      setIndex(next, { focus: true });
    }
    var handle = { root: root, update: update, setIndex: setIndex, destroy: function () {
      if (disposed) return;
      disposed = true;
      root.removeEventListener('click', click);
      root.removeEventListener('keydown', keydown);
      global.removeEventListener('resize', measure);
      if (observer) observer.disconnect();
      root.classList.remove('is-bound');
      indicator.hidden = true;
      bindings.delete(root);
    } };
    bindings.set(root, handle);
    root.addEventListener('click', click);
    root.addEventListener('keydown', keydown);
    global.addEventListener('resize', measure);
    if (observer) observer.observe(root);
    update();
    root.classList.add('is-bound');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return handle;
  }
  global.WegoSegmentControl = { bind: function (scope) {
    scope = scope || document;
    var roots = Array.from(scope.querySelectorAll('[data-component="segment-control"]'));
    if (scope.matches && scope.matches('[data-component="segment-control"]')) roots.unshift(scope);
    return roots.map(bindOne);
  } };
})(window);

/* Seg 分段控制器. Host owns business state; binding never dispatches business DOM events. */
(function () {
  "use strict";
  var legacyBind = window.WegoSegmentControl.bind;
  var bindings = new WeakMap();
  var itemSelector = ".wg-segment-control__item";

  function bind(root, options) {
    if (!root || !root.matches(".wg-segment-control")) throw new TypeError("Seg requires a .wg-segment-control root");
    options = options || {};
    if (bindings.has(root)) {
      var existing = bindings.get(root);
      existing.configure(options);
      return existing.handle;
    }
    var callbacks = {};
    var value;
    var destroyed = false;
    var observer;
    function items() {
      return Array.from(root.querySelectorAll(itemSelector)).filter(function (item) {
        return item.closest(".wg-segment-control") === root;
      });
    }
    function groupDisabled() { return root.getAttribute("aria-disabled") === "true" || root.hasAttribute("disabled"); }
    function disabled(item) { return groupDisabled() || item.disabled || item.getAttribute("aria-disabled") === "true"; }
    function layout() {
      if (destroyed) return;
      var track = root.querySelector(".wg-segment-control__track");
      var indicator = root.querySelector(".wg-segment-control__indicator");
      var list = items();
      if (!track || !indicator) return;
      if (root.dataset.layout !== "fill") {
        var width = Number(root.dataset.itemWidth);
        if (!(width > 0)) {
          width = 40;
          var measure = document.createElement("span");
          measure.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;white-space:pre;width:max-content;max-width:none;";
          document.body.appendChild(measure);
          list.forEach(function (item) {
            var label = item.querySelector(".wg-segment-control__label");
            if (!label) return;
            var style = getComputedStyle(label);
            measure.style.fontFamily = style.fontFamily;
            measure.style.fontSize = style.fontSize;
            measure.style.fontWeight = getComputedStyle(root).getPropertyValue("--Font14-medium-font-weight").trim();
            measure.style.letterSpacing = style.letterSpacing;
            measure.textContent = label.textContent;
            width = Math.max(width, Math.ceil(measure.getBoundingClientRect().width + 12));
          });
          measure.remove();
        }
        root.style.setProperty("--_seg-item-width", Math.max(40, width) + "px");
      }
      var selected = list.find(function (item) { return item.dataset.value === value; });
      indicator.hidden = !selected;
      if (selected) {
        // offset coordinates remain correct inside a scaled or translated host preview.
        root.style.setProperty("--_seg-indicator-x", selected.offsetLeft + "px");
        root.style.setProperty("--_seg-indicator-width", selected.offsetWidth + "px");
      }
    }
    function render(nextValue) {
      var list = items();
      var chosen = list.find(function (item) { return item.dataset.value === nextValue; });
      if (!chosen) chosen = list.find(function (item) { return item.dataset.value === value; });
      if (!chosen) chosen = list.find(function (item) { return !disabled(item); });
      value = chosen ? chosen.dataset.value : undefined;
      var focusable = chosen && !disabled(chosen) ? chosen : list.find(function (item) { return !disabled(item); });
      list.forEach(function (item) {
        item.setAttribute("aria-checked", String(item === chosen));
        item.tabIndex = item === focusable ? 0 : -1;
      });
      layout();
    }
    function select(item) {
      if (destroyed || !item || disabled(item)) return;
      var previousValue = value;
      render(item.dataset.value);
      var detail = { value: value, index: items().indexOf(item), previousValue: previousValue };
      var callback = previousValue === value ? callbacks.onReClick : callbacks.onChange;
      if (typeof callback === "function") callback(detail);
    }
    function onClick(event) {
      var item = event.target.closest(itemSelector);
      if (item && item.closest(".wg-segment-control") === root) select(item);
    }
    function onKeyDown(event) {
      var item = event.target.closest(itemSelector);
      if (!item || item.closest(".wg-segment-control") !== root || disabled(item)) return;
      var enabled = items().filter(function (candidate) { return !disabled(candidate); });
      var index = enabled.indexOf(item);
      var destination;
      var rtl = getComputedStyle(root).direction === "rtl";
      switch (event.key) {
        case "ArrowRight": index += rtl ? -1 : 1; break;
        case "ArrowLeft": index += rtl ? 1 : -1; break;
        case "ArrowDown": index += 1; break;
        case "ArrowUp": index -= 1; break;
        case "Home": index = 0; break;
        case "End": index = enabled.length - 1; break;
        case " ": case "Enter": destination = item; break;
        default: return;
      }
      event.preventDefault();
      if (event.repeat && (event.key === " " || event.key === "Enter")) return;
      destination = destination || enabled[(index + enabled.length) % enabled.length];
      destination.focus({ preventScroll: true });
      select(destination);
    }
    function configure(next) {
      if (destroyed) return;
      ["onChange", "onReClick"].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(next, key)) callbacks[key] = next[key];
      });
      render(Object.prototype.hasOwnProperty.call(next, "value") ? String(next.value) : value);
    }
    var handle = {
      update: function (next) { if (!destroyed) render(next && Object.prototype.hasOwnProperty.call(next, "value") ? String(next.value) : value); },
      setIndex: function (index) { if (Number.isInteger(index)) select(items()[index]); },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        root.removeEventListener("click", onClick);
        root.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", layout);
        if (observer) observer.disconnect();
        bindings.delete(root);
      }
    };
    bindings.set(root, { handle: handle, configure: configure });
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", layout);
    var initial = items().find(function (item) { return item.getAttribute("aria-checked") === "true"; });
    value = initial && initial.dataset.value;
    configure(options);
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(layout);
      observer.observe(root);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    return handle;
  }
  window.WegoSegmentControl = { bind: function (scope, options) {
    // Explicit new root returns a handle; legacy roots and scanned scopes retain arrays.
    if (scope && scope.matches && scope.matches(".wg-segment-control")) return bind(scope, options);
    scope = scope || document;
    var roots = Array.from(scope.querySelectorAll('[data-component="segment-control"]'));
    if (scope.matches && scope.matches('[data-component="segment-control"]')) roots.unshift(scope);
    return roots.map(function (root) {
      return root.matches(".wg-segment-control") ? bind(root, options) : legacyBind(root)[0];
    });
  } };
})();
