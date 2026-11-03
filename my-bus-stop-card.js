/*
 * My Bus Stop card for Home Assistant: live arrivals at your stop, on the route map, from the
 * My Bus Stop web app (https://amirhayek.dev/MyBusStop/web/). Free, no account, no API key.
 *
 * The card frames the web app's board for one stop and up to three lines. The board itself, which
 * stop and which lines, lives in the card's settings (`board`), chosen in the card's editor with the
 * web app's own stop picker. Arrival times come straight from each transit agency's open data to the
 * browser showing the dashboard; nothing goes through Home Assistant or any server of ours.
 *
 * MIT licence. https://github.com/hayek/my-bus-stop-card
 */

const CARD_VERSION = '1.0.1';
const SITE = 'https://amirhayek.dev/MyBusStop/web/';
const SITE_ORIGIN = new URL(SITE).origin;
const BOARD_PATTERN = /^[jz][A-Za-z0-9_-]{8,8000}$/;
const DEFAULT_HEIGHT = 540;
const THEMES = ['auto', 'light', 'dark', 'system'];

/** The board from a card's settings: `board`, or the `#b=` of a board link pasted as `url`. */
function boardOf(config) {
    if (config.board) return String(config.board);
    if (config.url) {
        const match = /#b=([A-Za-z0-9_-]+)/.exec(String(config.url));
        if (match) return match[1];
    }
    return null;
}

/** "auto" follows the dashboard's dark mode; "system" leaves it to the device. */
function themeFor(config, hass) {
    const chosen = THEMES.includes(config.theme) ? config.theme : 'auto';
    if (chosen !== 'auto') return chosen;
    return hass?.themes?.darkMode ? 'dark' : 'light';
}

function heightOf(config) {
    const value = config.height;
    if (typeof value === 'number' && value > 0) return `${value}px`;
    if (typeof value === 'string' && /^\d+(\.\d+)?(px|vh|em|rem)?$/.test(value.trim())) {
        return /\d$/.test(value.trim()) ? `${value.trim()}px` : value.trim();
    }
    return `${DEFAULT_HEIGHT}px`;
}

class MyBusStopCard extends HTMLElement {
    static getConfigElement() { return document.createElement('my-bus-stop-card-editor'); }

    static getStubConfig() { return { theme: 'auto' }; }

    constructor() {
        super();
        this._config = {};
        this._hass = null;
        this._layout = undefined;
        this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
        if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
        const board = boardOf(config);
        if (board && !BOARD_PATTERN.test(board)) throw new Error('"board" is not a My Bus Stop board. Choose the stop again in the card editor.');
        if (config.theme != null && !THEMES.includes(config.theme)) throw new Error(`"theme" must be one of: ${THEMES.join(', ')}`);
        this._config = { ...config };
        this._render();
    }

    set hass(hass) {
        const before = themeFor(this._config, this._hass);
        this._hass = hass;
        // Home Assistant sets this on every state change in the house; only the theme matters here.
        if (themeFor(this._config, hass) !== before || !this._built) this._render();
    }

    get hass() { return this._hass; }

    /** "grid" in a sections view and "panel" in a panel view: the card fills the space it is given. */
    set layout(layout) {
        this._layout = layout;
        this._render();
    }

    get layout() { return this._layout; }

    getCardSize() {
        return Math.max(3, Math.round(parseFloat(heightOf(this._config)) / 50));
    }

    getGridOptions() {
        return { columns: 12, rows: 9, min_columns: 4, min_rows: 3 };
    }

    _src() {
        const board = boardOf(this._config);
        if (!board) return null;
        const url = new URL(SITE);
        url.searchParams.set('embed', '1');
        url.searchParams.set('theme', themeFor(this._config, this._hass));
        url.hash = `b=${board}`;
        return url.toString();
    }

    _render() {
        if (!this.shadowRoot) return;
        if (!this._built) {
            this.shadowRoot.innerHTML = `
                <style>
                    :host { display: block; height: 100%; }
                    ha-card { overflow: hidden; height: 100%; display: flex; flex-direction: column; }
                    .frame { position: relative; width: 100%; flex: 1 1 auto; }
                    iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; }
                    .empty { padding: 16px; color: var(--secondary-text-color); line-height: 1.5; }
                    .empty strong { display: block; color: var(--primary-text-color); font-size: 1.1em; margin-bottom: 4px; }
                </style>
                <ha-card></ha-card>`;
            this._built = true;
        }
        const card = this.shadowRoot.querySelector('ha-card');
        const src = this._src();
        if (!src) {
            this._frame = null;
            card.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.innerHTML = '<strong>My Bus Stop</strong>Open this card’s editor and choose your stop and up to three lines.';
            card.append(empty);
            return;
        }
        let box = card.querySelector('.frame');
        if (!box) {
            card.innerHTML = '';
            box = document.createElement('div');
            box.className = 'frame';
            const frame = document.createElement('iframe');
            frame.setAttribute('allow', 'fullscreen; screen-wake-lock');
            frame.setAttribute('referrerpolicy', 'no-referrer');
            frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
            box.append(frame);
            card.append(box);
        }
        const fills = this._layout === 'grid' || this._layout === 'panel';
        box.style.height = fills ? '100%' : heightOf(this._config);
        const frame = box.querySelector('iframe');
        frame.title = this._config.stop ? `My Bus Stop: ${this._config.stop}` : 'My Bus Stop';
        // Only a real change reloads the board: a new board, or the dashboard turning dark or light.
        if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
    }
}

/**
 * The card's editor: the web app's own stop picker, framed, hands back the board chosen in it
 * (a message from the web app's origin, from that frame only), plus the theme and height.
 */
class MyBusStopCardEditor extends HTMLElement {
    constructor() {
        super();
        this._config = {};
        this._hass = null;
        this.attachShadow({ mode: 'open' });
        this._onMessage = (event) => this._receive(event);
    }

    connectedCallback() { window.addEventListener('message', this._onMessage); this._render(); }

    disconnectedCallback() { window.removeEventListener('message', this._onMessage); }

    setConfig(config) {
        this._config = { ...config };
        this._render();
    }

    set hass(hass) {
        const first = !this._hass;
        this._hass = hass;
        if (this._form) this._form.hass = hass;
        if (!this._picker) this._render();
        // Built before Home Assistant said which theme it is in: open the picker in that theme.
        else if (first) setTimeout(() => this._loadPicker(), 0);
    }

    /** Points the picker at the web app, in the dashboard's theme; once, unless the theme changed. */
    _loadPicker() {
        const url = this._pickerURL();
        if (!this._picker || url === this._pickerSrc) return;
        this._pickerSrc = url;
        this._picker.src = url;
    }

    _pickerURL() {
        const url = new URL(SITE);
        url.searchParams.set('pick', '1');
        url.searchParams.set('theme', this._hass?.themes?.darkMode ? 'dark' : 'light');
        return url.toString();
    }

    _receive(event) {
        if (event.origin !== SITE_ORIGIN || !this._picker || event.source !== this._picker.contentWindow) return;
        const message = event.data;
        if (!message || message.source !== 'mybusstop' || message.type !== 'board' || !BOARD_PATTERN.test(String(message.data))) return;
        const config = { ...this._config, board: message.data };
        delete config.url;
        if (typeof message.stop === 'string') config.stop = message.stop.slice(0, 200);
        if (Array.isArray(message.lines)) config.lines = message.lines.filter((l) => typeof l === 'string').slice(0, 3).map((l) => l.slice(0, 60));
        this._changed(config);
    }

    _changed(config) {
        this._config = config;
        this._renderSummary();
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
    }

    _render() {
        if (!this.shadowRoot || !this.isConnected) return;
        if (!this._picker) {
            this.shadowRoot.innerHTML = `
                <style>
                    :host { display: block; }
                    .summary { margin: 0 0 12px; line-height: 1.5; color: var(--primary-text-color); }
                    .summary small { display: block; color: var(--secondary-text-color); }
                    .picker { width: 100%; height: 560px; border: 1px solid var(--divider-color, #8884); border-radius: 12px; display: block; background: var(--card-background-color); }
                    .note { margin: 8px 0 16px; font-size: 0.9em; color: var(--secondary-text-color); line-height: 1.45; }
                    .note a { color: var(--primary-color); }
                </style>
                <p class="summary"></p>
                <iframe class="picker" title="Choose your stop" allow="geolocation" referrerpolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>
                <p class="note">Pick your region, find your stop, choose up to three lines and press <b>Use these lines</b>.
                    Arrival times come straight from the transit agency to this browser.
                    <a href="https://github.com/hayek/my-bus-stop-card#readme" target="_blank" rel="noopener">Help</a></p>
                <div class="form"></div>`;
            this._picker = this.shadowRoot.querySelector('.picker');
            // Next turn, so a theme Home Assistant hands over right after this is in the first load.
            setTimeout(() => this._loadPicker(), 0);
            this._buildForm();
        }
        this._renderSummary();
        if (this._form) this._form.data = { theme: 'auto', height: DEFAULT_HEIGHT, ...this._config };
    }

    _renderSummary() {
        const summary = this.shadowRoot.querySelector('.summary');
        if (!summary) return;
        const board = boardOf(this._config);
        summary.replaceChildren();
        if (!board) {
            summary.textContent = 'No stop chosen yet.';
            return;
        }
        const strong = document.createElement('strong');
        strong.textContent = this._config.stop || 'A board is set';
        summary.append('Showing ', strong);
        if (Array.isArray(this._config.lines) && this._config.lines.length) summary.append(` — lines ${this._config.lines.join(', ')}`);
        const hint = document.createElement('small');
        hint.textContent = 'Choose again below to change it.';
        summary.append(hint);
    }

    _buildForm() {
        const holder = this.shadowRoot.querySelector('.form');
        if (!customElements.get('ha-form')) {
            // Loaded with the dashboard editor; try again once it is there.
            customElements.whenDefined('ha-form').then(() => { if (!this._form) this._buildForm(); });
            return;
        }
        const form = document.createElement('ha-form');
        form.hass = this._hass;
        form.schema = [
            { name: 'theme', selector: { select: { mode: 'dropdown', options: [
                { value: 'auto', label: 'Follow the dashboard' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'Follow the device' },
            ] } } },
            { name: 'height', selector: { number: { min: 160, max: 2000, step: 10, mode: 'box', unit_of_measurement: 'px' } } },
        ];
        form.computeLabel = (schema) => ({ theme: 'Theme', height: 'Height (masonry and vertical-stack layouts)' }[schema.name] ?? schema.name);
        form.data = { theme: 'auto', height: DEFAULT_HEIGHT, ...this._config };
        form.addEventListener('value-changed', (event) => {
            const value = event.detail.value ?? {};
            const config = { ...this._config, theme: value.theme ?? 'auto' };
            if (Number(value.height) && Number(value.height) !== DEFAULT_HEIGHT) config.height = Number(value.height);
            else delete config.height;
            if (config.theme === 'auto') delete config.theme;
            this._changed(config);
        });
        holder.append(form);
        this._form = form;
    }
}

if (!customElements.get('my-bus-stop-card')) customElements.define('my-bus-stop-card', MyBusStopCard);
if (!customElements.get('my-bus-stop-card-editor')) customElements.define('my-bus-stop-card-editor', MyBusStopCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === 'my-bus-stop-card')) {
    window.customCards.push({
        type: 'my-bus-stop-card',
        name: 'My Bus Stop',
        description: 'Live bus arrivals at your stop, on the route map. Free, no account or API key.',
        preview: false,
        documentationURL: 'https://github.com/hayek/my-bus-stop-card',
    });
}

console.info(`%c MY BUS STOP CARD %c ${CARD_VERSION} `, 'background:#14140F;color:#F4F2EC;font-weight:700', 'background:#F4C400;color:#14140F;font-weight:700');
