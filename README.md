# SVG State Card

SVG State Card is a Home Assistant Lovelace card for coloring and controlling id'd SVG elements from entity state.

It is intended for focused SVG dashboards such as HVAC zone maps, floor heat maps, equipment diagrams, and other views where a full floorplan engine is more than you need.

## Preview

![SVG State Card preview](preview.svg)

## Installation

### HACS

Add this repository as a custom repository:

```text
https://github.com/stewartoallen/svg-state-card
```

Select category **Dashboard**, install **SVG State Card**, then refresh the browser.

HACS should add the dashboard resource automatically. If needed, add it manually:

```text
/hacsfiles/svg-state-card/svg-state-card.js
```

Resource type:

```text
JavaScript module
```

### Manual Install

Copy `svg-state-card.js` into:

```text
/config/www/community/svg-state-card/svg-state-card.js
```

Add this dashboard resource:

```text
/local/community/svg-state-card/svg-state-card.js
```

Resource type:

```text
JavaScript module
```

## Example

```yaml
type: custom:svg-state-card
title: Floor Zones
svg: /local/floorplan.svg
tap_action:
  action: more-info
double_tap_action:
  action: toggle
zones:
  - id: kitchen_zone
    action_id: kitchen_zone_tap
    entity: sensor.kitchen_temperature
    min: 65
    max: 80
    min_color: "#2563eb"
    color_70: "#22c55e"
    color_75: "#facc15"
    max_color: "#dc2626"
    double_tap_action:
      action: toggle
      entity: switch.kitchen_floor_heat
  - id: bedroom_zone
    entity: switch.bedroom_floor_heat
    state_colors:
      "on": "#f97316"
      "off": "#334155"
    tap_action:
      action: toggle
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `svg` | string | required | SVG URL, usually `/local/...`. |
| `zones` | list | `[]` | SVG element bindings. |
| `title` | string | none | Card title. Omit to hide. |
| `preserve_aspect_ratio` | string | `xMidYMid meet` | Root SVG `preserveAspectRatio` value. The SVG is scaled to fit card width. |
| `tap_action` | object/string | `more-info` | Default tap action. |
| `double_tap_action` | object/string | none | Default double-tap action. |
| `double_tap_window_ms` | number | `260` | Time window for double-tap detection. |
| `zones[].id` | string/list | required | SVG element id or ids. |
| `zones[].action_id` | string/list | `id` | SVG element id or ids used for tap/double-tap actions. Aliases: `tap_id`, `control_id`. |
| `zones[].entity` | string | none | Entity used for color and default action target. |
| `zones[].min` | number | none | Numeric color range minimum. |
| `zones[].max` | number | none | Numeric color range maximum. |
| `zones[].min_color` | color | none | Color at `min`. Alias: `color_min`. |
| `zones[].max_color` | color | none | Color at `max`. Alias: `color_max`. |
| `zones[].color_<number>` | color | none | Additional numeric interpolation stop. |
| `zones[].color_stops` | object | none | Numeric value-to-color map. |
| `zones[].state_colors` | object | none | State-to-color map. Keys can use `|` aliases. |
| `zones[].default_color` | color | none | Fallback fill color. |
| `zones[].stroke` | color | none | Runtime stroke color. |
| `zones[].opacity` | number | none | Runtime opacity. |
| `zones[].state_opacity` | object | none | State-to-opacity map. Keys can use `|` aliases. |
| `zones[].tap_action` | object/string | card default | Zone tap action. |
| `zones[].double_tap_action` | object/string | card default | Zone double-tap action. |
| `zones[].action_entity` | string | zone entity | Default action target override. |

## Actions

Supported actions:

- `more-info`
- `toggle`
- `navigate`
- `call-service`
- `none`

Examples:

```yaml
tap_action:
  action: more-info

double_tap_action:
  action: toggle
  entity: switch.kitchen_floor_heat

tap_action:
  action: call-service
  service: switch.turn_on
  service_data:
    entity_id: switch.kitchen_floor_heat
```

## SVG Notes

The SVG is fetched and inlined into the card so elements can be found by `id`.

The source SVG file is not modified. Runtime styling is applied in the browser with inline styles.

Display and action elements can be separate. Use `id` for the SVG element or elements that should be colored. Use `action_id` for transparent overlays or other SVG elements that should receive tap/double-tap actions:

```yaml
zones:
  - id:
      - kitchen_heat_area
      - dining_heat_area
    action_id: kitchen_dining_overlay
    entity: sensor.kitchen_temperature
    action_entity: switch.kitchen_dining_floor_heat
    tap_action: more-info
    double_tap_action: toggle
```

Remove scripts and inline event handlers from SVGs. The card strips `<script>` tags and `on...` attributes before rendering, but SVGs should still be treated as trusted local assets.

## Development

Run the syntax check:

```bash
npm run check
```
