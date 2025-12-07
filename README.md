# html2uuitk
Converts HTML + CSS layouts into Unity's UI toolkit USS and UXML

## Example usage

**Without config file (uses defaults):**
```
npx html2uuitk --input index.html --css index.css --output .
```

**With config file:**
```
npx html2uuitk --input index.html --css index.css --output . --config config.json
```

## Arguments
- input
    - Input HTML files [array] [required]
- css
    - CSS files [array] [required]
- reset
    - Reset CSS file [optional]
- config
    - Configuration file (JSON) [optional]
- output
    - Output folder [optional]
- help
    - Show help

## Configuration

The config file is optional. If not provided, the tool uses defaults:

```json
{
    "assets": {},
    "options": {
        "uppercase": false,
        "substituteVariables": false
    }
}
```

### Configuration Options

- **uppercase** (boolean): When enabled, converts text content to uppercase. Default: `false`
- **substituteVariables** (boolean): Enables CSS variable substitution. When enabled, replaces CSS custom properties (`--variable-name`) with their actual values in the generated USS files. Default: `false`
- **assets** (object): Maps CSS asset references to Unity asset paths. Used primarily for fonts and other resources that need to reference Unity meta IDs. Default: `{}`

### CSS Variable Substitution

When enabled, replaces CSS variables with their actual values:

**CSS Input:**
```css
:root {
    --primary-color: #2E2D31;
}

.button {
    background-color: var(--primary-color);
}
```

**With `substituteVariables: true`:**
```css
.button {
    background-color: #2E2D31;
}
```

### Unity Asset Mapping

The `assets` configuration option allows you to map CSS asset references (primarily fonts) to Unity asset paths using their meta IDs.

#### How It Works

When the converter encounters a `font-family` property in CSS, it transforms it to `-unity-font` in USS. If the font name is found in the `assets` mapping, it replaces the value with the corresponding Unity asset path.

#### Configuration Example

```json
{
    "assets": {
        "Roboto": {
            "path": "Assets/Fonts/Roboto-Regular.asset"
        }
    },
    "options": {
        "uppercase": false,
        "substituteVariables": false
    }
}
```

#### Example Usage

**CSS Input:**
```css
.icon {
    font-family: 'Roboto';
    font-size: 24px;
}
```

**With Asset Mapping:**
```css
.icon {
    -unity-font: url("Assets/Fonts/Roboto-Regular.asset");
    font-size: 24px;
}
```

#### Finding Unity Asset Paths

To get the correct Unity asset paths:

1. **In Unity Editor**: Select the font asset in your Project window
2. **Copy Path**: Right-click → "Copy Path" or note the path in the Inspector

## CSS to USS Property Mapping

The tool automatically transforms CSS properties:

### Property Transformations
- `background` → `background-color`
- `font-family` → `-unity-font`
- `text-align` → `-unity-text-align`

### Value Transformations
- `text-align: center` → `-unity-text-align: middle-center`
- `vw` → `%` and `vh` → `%`
- `letter-spacing` values are doubled for Unity

Unsupported properties show warnings during conversion.