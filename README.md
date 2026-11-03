# My Bus Stop card for Home Assistant

Live arrivals at your bus stop on a Home Assistant dashboard: the next bus in big numbers, the one after it, and the route map with the buses moving along it. The card comes from [My Bus Stop](https://amirhayek.dev/MyBusStop/), a free transit app, and runs its [web version](https://amirhayek.dev/MyBusStop/web/) inside the card.

- **Free.** You don't need an account or an API key.
- **Set up in the card editor.** Pick your region, search for your stop (or find stops near you) and choose up to three lines.
- **Follows your dashboard's theme.** The card is light or dark to match the dashboard, or you can fix it to one.
- **Fits any size.** If the card is too short for the map, it shows just the arrival times.
- **Wall mode.** Opens the board full screen and keeps the screen on, for a tablet on the wall.

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=hayek&repository=my-bus-stop-card&category=plugin)

## Where it works

| Live bus positions and arrivals | Arrival times only |
|---|---|
| Israel, Norway, Turku, Tampere, Lisbon area, Rennes, Brussels, Boston, Minneapolis–St Paul, Toronto, Tokyo | London, Switzerland, Nuremberg, Hong Kong (KMB, Citybus, Green Minibus, NLB) |

Anywhere else, arrival times come from [Transitous](https://transitous.org/), a community service built on transit agencies' open data.

## Install

### With HACS (recommended)

1. Click the button above. Or open **HACS** in Home Assistant, go to the **⋮** menu and choose **Custom repositories**, add `https://github.com/hayek/my-bus-stop-card` with the type **Dashboard**, then search for **My Bus Stop**.
2. Click **Download**, then reload the browser.

### By hand

1. Download `my-bus-stop-card.js` from the [latest release](https://github.com/hayek/my-bus-stop-card/releases/latest) and put it in your `config/www/` folder.
2. Go to **Settings → Dashboards → ⋮ → Resources**, click **Add resource**, enter the URL `/local/my-bus-stop-card.js` and choose the type **JavaScript module**.

## Add the card

1. Edit a dashboard, click **Add card** and choose **My Bus Stop**.
2. In the editor, pick your region and find your stop. Choose up to three lines, then press **Use these lines**. The preview next to the editor switches to your board.
3. Click **Save**.

To show more stops, add one card per stop.

### Options

| Option | Default | What it does |
|---|---|---|
| `board` | none | The stop and lines to show. The editor fills this in for you. |
| `url` | none | Instead of `board`: a link from **Copy link to this board** in the web version's ⚙ menu. |
| `theme` | `auto` | `auto` matches the dashboard. `light` and `dark` fix the theme. `system` follows the device. |
| `height` | `480` | Card height in pixels, for masonry and stack layouts. In a sections or panel view, the card fills the space it's given instead. |

Set up from YAML, using a link copied from the web version:

```yaml
type: custom:my-bus-stop-card
url: https://amirhayek.dev/MyBusStop/web/#b=z…
theme: auto
```

## Without installing anything

Home Assistant's built-in **Webpage** card can show a board too:

1. Open [the web version](https://amirhayek.dev/MyBusStop/web/), pick your stop and lines, then choose **⚙ → Copy link to this board**.
2. In the copied link, add `?embed=1` right before the `#`. The result looks like `https://amirhayek.dev/MyBusStop/web/?embed=1#b=z…`. That shows the board on its own, without saving anything in the browser.
3. Add a **Webpage** card with that URL:

```yaml
type: iframe
url: https://amirhayek.dev/MyBusStop/web/?embed=1&theme=dark#b=z…
aspect_ratio: 100%
allow: fullscreen; screen-wake-lock
```

You can also add the same URL as a whole dashboard: **Settings → Dashboards → Add dashboard → Webpage**.

## Privacy

- The card sends nothing about your home, your devices or your Home Assistant anywhere.
- The stop and lines you chose are stored in the card's own settings on your Home Assistant. They go to the web version only as part of the link, after the `#`, and are never sent to the site's server or its analytics.
- Arrival times come straight from each transit agency to the browser showing the dashboard. Israel is the one exception: its requests pass through a keyless relay, as the [privacy policy](https://amirhayek.dev/MyBusStop/privacy/) explains.
- **Find stops near me** in the editor uses your location once, only if the browser asks and you allow it. It's never stored.

## About

My Bus Stop is an independent app, not made or endorsed by any transit agency or by Home Assistant. It's also available for [iPhone, iPad, Mac, Apple Watch and Apple TV](https://amirhayek.dev/MyBusStop/).

MIT licence.
