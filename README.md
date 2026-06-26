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
entity_aliases:
  kitchen_temp: sensor.kitchen_temperature
  kitchen_heat: switch.kitchen_floor_heat
  bedroom_heat: switch.bedroom_floor_heat
tap_action:
  action: more-info
double_tap_action:
  action: toggle
display:
  - id: kitchen_zone
    entity_alias: kitchen_temp
    min: 65
    max: 80
    min_color: "#2563eb"
    color_70: "#22c55e"
    color_75: "#facc15"
    max_color: "#dc2626"
  - id: bedroom_zone
    entity_alias: bedroom_heat
    state_colors:
      "on": "#f97316"
      "off": "#334155"
action:
  - id: kitchen_zone_tap
    entity_alias: kitchen_heat
    double_tap_action:
      action: toggle
  - id:
      - bedroom_zone
      - bedroom_overlay
    entity_alias: bedroom_heat
    tap_action:
      action: toggle
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `svg` | string | required | SVG URL, usually `/local/...`. |
| `entity_aliases` | object | `{}` | Local alias-to-entity-id map for this card. |
| `display` | list | `[]` | SVG element bindings that receive runtime fill/stroke/opacity. |
| `action` | list | `[]` | SVG element bindings that receive tap/double-tap actions. |
| `zones` | list | `[]` | Compact compatibility form that combines `display` and `action`. |
| `title` | string | none | Card title. Omit to hide. |
| `preserve_aspect_ratio` | string | `xMidYMid meet` | Root SVG `preserveAspectRatio` value. The SVG is scaled to fit card width. |
| `tap_action` | object/string | `more-info` | Default tap action. |
| `double_tap_action` | object/string | none | Default double-tap action. |
| `double_tap_window_ms` | number | `260` | Time window for double-tap detection. |
| `display[].id` | string/list | required | SVG element id or ids to style. |
| `display[].entity_id` | string | none | Home Assistant entity id used for color. |
| `display[].entity_alias` | string | none | Key from `entity_aliases` used for color. |
| `display[].min` | number | none | Numeric color range minimum. |
| `display[].max` | number | none | Numeric color range maximum. |
| `display[].min_color` | color | none | Color at `min`. Alias: `color_min`. |
| `display[].max_color` | color | none | Color at `max`. Alias: `color_max`. |
| `display[].color_<number>` | color | none | Additional numeric interpolation stop. |
| `display[].color_stops` | object | none | Numeric value-to-color map. |
| `display[].state_colors` | object | none | State-to-color map. Keys can use `|` aliases. |
| `display[].default_color` | color | none | Fallback fill color. |
| `display[].stroke` | color | none | Runtime stroke color. |
| `display[].opacity` | number | none | Runtime opacity. |
| `display[].state_opacity` | object | none | State-to-opacity map. Keys can use `|` aliases. |
| `action[].id` | string/list | required | SVG element id or ids that receive actions. |
| `action[].entity_id` | string | none | Default action target entity. |
| `action[].entity_alias` | string | none | Key from `entity_aliases` used as the default action target. |
| `action[].tap_action` | object/string | card default | Tap action. |
| `action[].double_tap_action` | object/string | card default | Double-tap action. |

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
  entity_id: switch.kitchen_floor_heat

double_tap_action:
  action: toggle
  entity_alias: kitchen_heat

tap_action:
  action: call-service
  service: switch.turn_on
  service_data:
    entity_id: switch.kitchen_floor_heat
```

## SVG Notes

The SVG is fetched and inlined into the card so elements can be found by `id`.

The source SVG file is not modified. Runtime styling is applied in the browser with inline styles.

Display and action elements can be separate. Prefer `display` for the SVG element or elements that should be colored, and `action` for transparent overlays or other SVG elements that should receive tap/double-tap actions:

```yaml
entity_aliases:
  kitchen_temp: sensor.kitchen_temperature
  kitchen_dining_heat: switch.kitchen_dining_floor_heat

display:
  - id:
      - kitchen_heat_area
      - dining_heat_area
    entity_alias: kitchen_temp

action:
  - id: kitchen_dining_overlay
    entity_alias: kitchen_dining_heat
    tap_action: more-info
    double_tap_action: toggle
```

The compact `zones` form is also supported:

```yaml
zones:
  - id:
      - kitchen_heat_area
      - dining_heat_area
    action_id: kitchen_dining_overlay
    entity_id: sensor.kitchen_temperature
    action_entity_id: switch.kitchen_dining_floor_heat
    tap_action: more-info
    double_tap_action: toggle
```

Remove scripts and inline event handlers from SVGs. The card strips `<script>` tags and `on...` attributes before rendering, but SVGs should still be treated as trusted local assets.

## Development

Run the syntax check:

```bash
npm run check
```
