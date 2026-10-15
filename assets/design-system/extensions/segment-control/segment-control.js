/* Seg 分段控制器. Host owns business state; binding never dispatches business DOM events. */
(function () {
  "use strict";
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
  window.WegoSegmentControl = { bind: bind };
})();
