const SVG_STATE_CARD_VERSION = "0.1.0";

class SvgStateCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("svg-state-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:svg-state-card",
      title: "SVG State",
      svg: "/local/floorplan.svg",
      zones: [],
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = undefined;
    this._hass = undefined;
    this._svgText = "";
    this._svgUrl = "";
    this._loading = false;
    this._error = "";
    this._lastStateSignature = "";
    this._tapTimer = undefined;
    this._pendingPointer = undefined;

    this.shadowRoot.addEventListener("pointerdown", (event) => this._handlePointerDown(event));
    this.shadowRoot.addEventListener("pointerup", (event) => this._handlePointerUp(event));
    this.shadowRoot.addEventListener("pointercancel", () => this._clearPendingPointer());
    this.shadowRoot.addEventListener("click", (event) => this._handleClick(event));
  }

  setConfig(config) {
    if (!config || !config.svg) {
      throw new Error("svg is required");
    }

    this._config = {
      title: "",
      zones: [],
      tap_action: { action: "more-info" },
      double_tap_action: undefined,
      hold_action: undefined,
      ...config,
    };
    this._lastStateSignature = "";
    this._loadSvg();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;

    const signature = this._stateSignature();
    if (signature !== this._lastStateSignature) {
      this._lastStateSignature = signature;
      this._applyZoneStyles();
    }
  }

  getCardSize() {
    return 3;
  }

  async _loadSvg() {
    const url = this._config.svg;
    if (!url || url === this._svgUrl) return;

    this._svgUrl = url;
    this._loading = true;
    this._error = "";
    this._render();

    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Failed to load SVG: ${response.status}`);
      this._svgText = await response.text();
    } catch (err) {
      this._svgText = "";
      this._error = err?.message || String(err);
    } finally {
      this._loading = false;
      this._render();
    }
  }

  _render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        ha-card {
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .header {
          padding: 10px 12px 4px;
          color: var(--ha-card-header-color, var(--primary-text-color));
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-card-header-font-size, 18px);
          line-height: 1.2;
        }

        .status {
          position: absolute;
          top: 8px;
          right: 12px;
          z-index: 2;
          max-width: calc(100% - 24px);
          box-sizing: border-box;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--mdc-theme-surface, var(--ha-card-background, var(--card-background-color)));
          color: var(--secondary-text-color);
          box-shadow: var(--ha-card-box-shadow, 0 3px 10px rgb(0 0 0 / 16%));
          font-size: 12px;
          line-height: 1.3;
          padding: 4px 8px;
          pointer-events: none;
        }

        .status.error {
          color: var(--error-color);
        }

        .svg-wrap {
          line-height: 0;
          padding: var(--svg-state-card-padding, 0);
          width: 100%;
        }

        .svg-wrap svg {
          display: block;
          height: auto;
          max-width: 100%;
          width: 100%;
        }

        .svg-wrap [data-svg-state-action] {
          cursor: pointer;
          pointer-events: all;
        }

        .svg-wrap [data-svg-state-zone] {
          transition: fill 180ms ease, stroke 180ms ease, opacity 180ms ease;
        }
      </style>
      <ha-card>
        ${this._config.title ? `<div class="header">${this._escape(this._config.title)}</div>` : ""}
        ${
          this._loading || this._error
            ? `<div class="status ${this._error ? "error" : ""}">${this._escape(this._error || "Loading SVG...")}</div>`
            : ""
        }
        <div class="svg-wrap">${this._sanitizeSvg(this._svgText)}</div>
      </ha-card>
    `;

    this._applyZoneStyles();
  }

  _zones() {
    return (this._config?.zones || []).filter((zone) => zone && this._zoneDisplayIds(zone).length > 0);
  }

  _stateSignature() {
    return this._zones()
      .map((zone) => {
        const stateObj = this._hass?.states?.[zone.entity];
        return [
          this._zoneDisplayIds(zone).join(","),
          this._zoneActionIds(zone).join(","),
          zone.entity || "",
          stateObj?.state || "",
          stateObj?.last_changed || "",
          stateObj?.last_updated || "",
        ].join(":");
      })
      .join("|");
  }

  _applyZoneStyles() {
    if (!this._config || !this._hass) return;

    for (const zone of this._zones()) {
      const elements = this._zoneElements(zone);
      const primaryId = this._primaryZoneId(zone);

      const stateObj = this._hass.states?.[zone.entity];
      const color = this._zoneColor(zone, stateObj);
      const opacity = this._zoneOpacity(zone, stateObj);
      const stroke = this._zoneStroke(zone, stateObj);

      for (const element of elements) {
        element.dataset.svgStateZone = primaryId;
        if (color) element.style.fill = color;
        if (stroke) element.style.stroke = stroke;
        if (opacity !== undefined) element.style.opacity = String(opacity);
      }

      for (const element of this._zoneActionElements(zone)) {
        element.dataset.svgStateAction = primaryId;
        if (zone.entity) element.dataset.entityId = zone.entity;
        element.style.pointerEvents = "all";
      }
    }
  }

  _zoneElements(zone) {
    return this._elementsByIds(this._zoneDisplayIds(zone));
  }

  _zoneActionElements(zone) {
    return this._elementsByIds(this._zoneActionIds(zone));
  }

  _elementsByIds(ids) {
    const root = this.shadowRoot.querySelector(".svg-wrap svg");
    if (!root) return [];

    return ids.flatMap((id) => {
      const escaped = this._cssEscape(id);
      return [...root.querySelectorAll(`#${escaped}`)];
    });
  }

  _zoneDisplayIds(zone) {
    return this._asArray(zone.id ?? zone.display_id ?? zone.display_ids ?? zone.element_id ?? zone.elements);
  }

  _zoneActionIds(zone) {
    const actionIds = zone.action_id ?? zone.action_ids ?? zone.tap_id ?? zone.tap_ids ?? zone.control_id ?? zone.control_ids;
    return this._asArray(actionIds ?? zone.id);
  }

  _primaryZoneId(zone) {
    return this._zoneDisplayIds(zone)[0] || "";
  }

  _asArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  }

  _zoneColor(zone, stateObj) {
    const state = stateObj?.state;
    const numeric = Number(state);
    if (Number.isFinite(numeric)) {
      const color = this._numericColor(zone, numeric);
      if (color) return color;
    }

    return this._stateColor(zone, state);
  }

  _numericColor(zone, value) {
    const stops = this._colorStops(zone);
    if (stops.length < 2) return "";

    if (value <= stops[0].value) return this._rgbColor(stops[0].color);
    if (value >= stops[stops.length - 1].value) return this._rgbColor(stops[stops.length - 1].color);

    for (let index = 0; index < stops.length - 1; index += 1) {
      const left = stops[index];
      const right = stops[index + 1];
      if (value < left.value || value > right.value) continue;

      const ratio = (value - left.value) / Math.max(1e-9, right.value - left.value);
      return this._interpolateColor(left.color, right.color, ratio);
    }

    return "";
  }

  _colorStops(zone) {
    const stops = [];
    const min = this._numberOrUndefined(zone.min ?? zone.min_value);
    const max = this._numberOrUndefined(zone.max ?? zone.max_value);
    const minColor = this._parseColor(zone.min_color ?? zone.color_min);
    const maxColor = this._parseColor(zone.max_color ?? zone.color_max);

    if (min !== undefined && minColor) stops.push({ value: min, color: minColor });
    if (max !== undefined && maxColor) stops.push({ value: max, color: maxColor });

    const map = zone.color_stops || zone.colors;
    if (map && typeof map === "object" && !Array.isArray(map)) {
      for (const [key, value] of Object.entries(map)) {
        const stopValue = Number(key);
        const color = this._parseColor(value);
        if (Number.isFinite(stopValue) && color) stops.push({ value: stopValue, color });
      }
    }

    for (const [key, value] of Object.entries(zone)) {
      const match = key.match(/^color_(-?\d+(?:\.\d+)?)$/);
      if (!match) continue;

      const stopValue = Number(match[1]);
      const color = this._parseColor(value);
      if (Number.isFinite(stopValue) && color) stops.push({ value: stopValue, color });
    }

    const byValue = new Map();
    for (const stop of stops) byValue.set(stop.value, stop);
    return [...byValue.values()].sort((a, b) => a.value - b.value);
  }

  _stateColor(zone, state) {
    const colors = zone.state_colors || zone.state_color || {};
    const raw = String(state ?? "").trim();
    const lower = raw.toLowerCase();

    for (const [key, color] of Object.entries(colors)) {
      const matches = String(key)
        .split("|")
        .map((part) => part.trim().toLowerCase());
      if (matches.includes(lower)) return String(color);
    }

    return zone.default_color || "";
  }

  _zoneOpacity(zone, stateObj) {
    if (zone.opacity !== undefined) return this._numberOrUndefined(zone.opacity);

    const state = String(stateObj?.state ?? "").trim().toLowerCase();
    const stateOpacity = zone.state_opacity || {};
    for (const [key, value] of Object.entries(stateOpacity)) {
      const matches = String(key)
        .split("|")
        .map((part) => part.trim().toLowerCase());
      if (matches.includes(state)) return this._numberOrUndefined(value);
    }

    return undefined;
  }

  _zoneStroke(zone) {
    return zone.stroke || "";
  }

  _handlePointerDown(event) {
    const target = event.target.closest?.("[data-svg-state-action]");
    if (!target) return;

    this._pendingPointer = {
      zoneId: target.dataset.svgStateZone,
      actionId: target.dataset.svgStateAction,
      entityId: target.dataset.entityId,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  _handlePointerUp(event) {
    const pending = this._pendingPointer;
    this._pendingPointer = undefined;
    if (!pending || pending.pointerId !== event.pointerId) return;

    const moved = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
    if (moved > 8) return;

    const zone = this._zoneById(pending.actionId);
    if (!zone) return;

    event.preventDefault();
    event.stopPropagation();
    this._handleZoneTap(zone, pending.entityId);
  }

  _clearPendingPointer() {
    this._pendingPointer = undefined;
  }

  _handleClick(event) {
    const target = event.target.closest?.("[data-svg-state-action]");
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
  }

  _handleZoneTap(zone, entityId) {
    const delay = Number(this._config?.double_tap_window_ms ?? 260);

    if (this._tapTimer) {
      clearTimeout(this._tapTimer);
      this._tapTimer = undefined;
      this._performAction(zone.double_tap_action || this._config.double_tap_action || { action: "more-info" }, zone, entityId);
      return;
    }

    this._tapTimer = setTimeout(() => {
      this._tapTimer = undefined;
      this._performAction(zone.tap_action || this._config.tap_action || { action: "more-info" }, zone, entityId);
    }, delay);
  }

  _zoneById(id) {
    return this._zones().find((zone) => {
      return this._zoneDisplayIds(zone).includes(id) || this._zoneActionIds(zone).includes(id);
    });
  }

  async _performAction(actionConfig, zone, entityId) {
    const action = typeof actionConfig === "string" ? { action: actionConfig } : actionConfig || {};
    const actionName = String(action.action || "more-info").trim().toLowerCase();
    const targetEntity = action.entity || action.entity_id || zone.action_entity || entityId || zone.entity;

    if (actionName === "none" || actionName === "off") return;
    if (actionName === "more-info" || actionName === "more_info") {
      this._showMoreInfo(targetEntity);
      return;
    }
    if (actionName === "toggle") {
      if (targetEntity) await this._callService("homeassistant", "toggle", { entity_id: targetEntity });
      return;
    }
    if (actionName === "navigate") {
      const path = action.navigation_path || action.path;
      if (path) window.history.pushState(null, "", path);
      window.dispatchEvent(new CustomEvent("location-changed"));
      return;
    }
    if (actionName === "call-service" || actionName === "call_service") {
      const [domain, service] = String(action.service || "").split(".");
      if (domain && service) await this._callService(domain, service, action.service_data || action.data || {});
    }
  }

  async _callService(domain, service, data) {
    if (!this._hass) return;
    try {
      await this._hass.callService(domain, service, data);
    } catch (err) {
      this._error = err?.message || String(err);
      this._render();
    }
  }

  _showMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  _sanitizeSvg(svgText) {
    if (!svgText) return "";

    const template = document.createElement("template");
    template.innerHTML = svgText;
    template.content.querySelectorAll("script").forEach((element) => element.remove());
    template.content.querySelectorAll("*").forEach((element) => {
      for (const attribute of [...element.attributes]) {
        if (attribute.name.toLowerCase().startsWith("on")) element.removeAttribute(attribute.name);
      }
    });

    this._normalizeSvgRoot(template.content.querySelector("svg"));
    return template.innerHTML;
  }

  _normalizeSvgRoot(svg) {
    if (!svg) return;

    const width = this._svgDimension(svg.getAttribute("width"));
    const height = this._svgDimension(svg.getAttribute("height"));
    if (!svg.getAttribute("viewBox") && width !== undefined && height !== undefined) {
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    svg.setAttribute("width", "100%");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", this._config?.preserve_aspect_ratio || "xMidYMid meet");
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.maxWidth = "100%";
  }

  _svgDimension(value) {
    if (!value) return undefined;
    const match = String(value).trim().match(/^(-?\d+(?:\.\d+)?)(?:px)?$/i);
    if (!match) return undefined;
    const numeric = Number(match[1]);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }

  _numberOrUndefined(value) {
    if (value === undefined || value === null || value === "") return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  _parseColor(value) {
    if (!value) return undefined;
    const color = String(value).trim();

    const hex = color.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      return [0, 2, 4].map((offset) => parseInt(hex[1].slice(offset, offset + 2), 16));
    }

    const shortHex = color.match(/^#([0-9a-f]{3})$/i);
    if (shortHex) {
      return [...shortHex[1]].map((part) => parseInt(`${part}${part}`, 16));
    }

    const rgb = color.match(/^rgb\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*\)$/i);
    if (rgb) {
      return rgb.slice(1).map((part) => Math.min(255, Math.max(0, Number(part))));
    }

    return undefined;
  }

  _interpolateColor(min, max, ratio) {
    const channels = min.map((value, index) => Math.round(value + (max[index] - value) * ratio));
    return this._rgbColor(channels);
  }

  _rgbColor(channels) {
    return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
  }

  _cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replaceAll('"', '\\"').replaceAll("\\", "\\\\");
  }

  _escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

class SvgStateCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _render() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <ha-alert alert-type="info">
        Configure this card in YAML.
      </ha-alert>
    `;
  }
}

if (!customElements.get("svg-state-card-editor")) {
  customElements.define("svg-state-card-editor", SvgStateCardEditor);
}

if (!customElements.get("svg-state-card")) {
  customElements.define("svg-state-card", SvgStateCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "svg-state-card")) {
  window.customCards.push({
    type: "svg-state-card",
    name: "SVG State Card",
    preview: true,
    description: "Color and control id'd SVG elements from Home Assistant entity state.",
    documentationURL: "https://github.com/stewartoallen/svg-state-card",
  });
}

console.info(
  `%cSVG-STATE-CARD%c ${SVG_STATE_CARD_VERSION} loaded`,
  "color:#06b6d4;font-weight:700",
  "color:inherit"
);
