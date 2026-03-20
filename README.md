# html2uuitk

Converts HTML + CSS layouts into Unity UI Toolkit USS and UXML.

## Installation

```bash
npm install -g html2uuitk
```

## Usage

```bash
# Basic usage
npx html2uuitk --input index.html --css styles.css --output ./output

# Multiple files
npx html2uuitk -i page1.html page2.html --css base.css theme.css -o ./output

# With reset CSS and config
npx html2uuitk -i index.html --css styles.css --reset reset.css --config config.json -o ./output
```

## Arguments

| Argument | Alias | Type | Required | Description |
|----------|-------|------|----------|-------------|
| `--input` | `-i` | array | Yes | Input HTML files |
| `--css` | | array | Yes | CSS files to convert |
| `--reset` | | string | No | Reset CSS file |
| `--output` | `-o` | string | Yes | Output folder |
| `--config` | `-c` | string | No | Configuration file (JSON) |
| `--help` | | | | Show help |

## Features

### HTML to UXML Element Mapping

| HTML | UXML |
|------|------|
| `div`, `section`, `nav`, `header`, `footer`, `main`, `aside`, `article`, `ul`, `ol`, `li`, `img` | `ui:VisualElement` |
| `p`, `span`, `a`, `h1`–`h6`, `label`, `strong`, `em`, `small`, `code`, `b`, `i`, `mark`, `abbr`, `cite`, `q`, `time` | `ui:Label` |
| `input[type="text"]`, `textarea` | `ui:TextField` |
| `input[type="checkbox"]` | `ui:Toggle` |
| `input[type="radio"]` | `ui:RadioButton` |
| `input[type="range"]` | `ui:Slider` |
| `input[type="number"]` | `ui:IntegerField` |
| `button` | `ui:Button` |
| `select` | `ui:DropdownField` |
| `progress` | `ui:ProgressBar` |

Elements like `script`, `style`, `head`, `form`, `svg`, `canvas`, `audio`, `video`, and `iframe` are skipped. Table elements (`table`, `tr`, `td`, etc.) and other HTML-only elements produce warnings.

### CSS to USS Property Conversion

The tool supports 73+ USS properties and handles these transformations:

**Property mappings:**
- `font-family` → `-unity-font`
- `text-align` → `-unity-text-align`
- `font-style` → `-unity-font-style`
- `font-weight` → `-unity-font-style`

**Value mappings:**

| CSS | USS |
|-----|-----|
| `text-align: left` | `-unity-text-align: middle-left` |
| `text-align: center` | `-unity-text-align: middle-center` |
| `text-align: right` | `-unity-text-align: middle-right` |
| `display: block/grid/inline-*` | `display: flex` |
| `overflow: auto/scroll` | `overflow: hidden` |
| `position: fixed` | `position: absolute` |
| `font-weight: 600+` | `-unity-font-style: bold` |

**Unit conversions:**
- `rem`/`em` → `px` (base 16px)
- `vw`/`vh` → `%`
- `letter-spacing` values are doubled for Unity
- Leading decimals fixed: `.5px` → `0.5px`
- Modern color syntax normalized: `rgb(0 0 0 / 0.5)` → `rgba(0, 0, 0, 0.5)`

### Shorthand Expansion

CSS shorthands are expanded into individual USS properties:

- **margin/padding** — 1 to 4 value shorthand (e.g. `margin: 10px 20px` → individual sides)
- **border-radius** — 1 to 4 value shorthand → individual corners
- **border** — `border: 1px solid #000` → `border-width` + `border-color`
- **font** — `font: italic bold 16px/1.5 Roboto` → individual font properties
- **background** — `background: #fff url(bg.png) no-repeat` → individual background properties

### Box Shadow

```css
box-shadow: 2px 4px 8px rgba(0,0,0,0.3);
```

Maps to USS custom shadow properties: `--unity-shadow-offset-x`, `--unity-shadow-offset-y`, `--unity-shadow-blur-radius`, `--unity-shadow-color`.

### Pseudo-Classes

Supported: `:hover`, `:active`, `:focus`

Unsupported pseudo-classes and pseudo-elements (`::before`, `::after`, `:nth-child()`, etc.) are discarded with warnings.

### CSS Variables

CSS custom properties (`var()`) are supported with:
- Variable extraction from `:root` and other rules
- Chain resolution (`var(--a)` → `var(--b)` → final value)
- Fallback values: `var(--missing, #ff0000)`
- Circular reference detection

By default, `var()` references are preserved in the USS output. Enable `substituteVariables` in config to inline the resolved values.

### Rule Deduplication

When multiple selectors map to the same USS output (e.g. `h1`, `h2`, `h3` all become `Label`), duplicate rules are automatically deduplicated.

## Configuration

The config file is optional. All options have sensible defaults.

```json
{
    "assets": {
        "Roboto": {
            "path": "Assets/Fonts/Roboto-Regular.asset"
        }
    },
    "options": {
        "uppercase": false,
        "substituteVariables": false,
        "focusable": false
    }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `uppercase` | boolean | `false` | Convert text content to uppercase in UXML |
| `substituteVariables` | boolean | `false` | Replace `var()` references with resolved values |
| `focusable` | boolean | — | Set `focusable` attribute on input elements |
| `assets` | object | `{}` | Map font names to Unity asset paths |

### Asset Mapping

Map CSS font names to Unity asset paths:

```json
{
    "assets": {
        "Roboto": { "path": "Assets/Fonts/Roboto-Regular.asset" }
    }
}
```

**Before:**
```css
.text { font-family: 'Roboto'; }
```

**After:**
```
.text { -unity-font: url("Assets/Fonts/Roboto-Regular.asset"); }
```

To find Unity asset paths, select the font asset in Unity's Project window and use right-click → "Copy Path".

## Unsupported Properties

Properties not supported by USS (e.g. `cursor`) are skipped with warnings during conversion.
