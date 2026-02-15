---
name: color-picker
domain: interactive
intent: Color selection with visual picker, swatches, and input formats
complexity: intermediate
components: Input, Popover, Slider
---

# Color Picker

## Layer Pattern
Color picking is an input layer that provides visual color selection.
It layers into forms and settings as a specialized Input control.

## Architecture

### Popover Picker
Trigger: Button showing current color (w-8 h-8 rounded border) +
color value text. Popover content: color area + controls.

### Picker Content
- **Color area:** 2D gradient square — X axis = saturation, Y axis = brightness.
  Click/drag to select. Implemented with canvas or CSS gradients.
- **Hue slider:** Horizontal Slider (0-360) with rainbow gradient background.
- **Alpha slider:** Horizontal Slider (0-100) with checkerboard + color gradient.
- **Value inputs:** flex row — Input for hex (#FF5733) + Inputs for RGB (255, 87, 51).
  Toggle between hex/rgb/hsl with Button.
- **Preset swatches:** Grid of color circles (w-6 h-6 rounded-full) for quick picks.

## Patterns

### Full Picker
- Popover with color area + hue slider + alpha slider + value inputs + swatches
- State: { h, s, l, a } converted to display format
- Two-way binding: changing any input updates all others

### Swatch Grid
- Grid of preset colors only — no custom picker
- Simpler, fewer choices, faster selection
- Good for theme color selection (brand colors, status colors)

### Input-Only
- Input with color preview swatch beside it
- User types hex/rgb value directly
- Validate format on blur, show error for invalid colors
- Native `<input type="color">` as fallback

### Gradient Picker
- Two color stops with individual pickers
- Slider for gradient angle/direction
- Preview bar showing resulting gradient
- Output: CSS gradient string

## Anti-Patterns
- ❌ No text input — always allow typing exact color values
- ❌ No preview of selected color — show swatch alongside value
- ❌ No preset swatches — common colors speed up selection
- ❌ Picker without format labels — label inputs as HEX, RGB, or HSL

## Composition Notes
- Embeds in settings-panel for theme/color customization
- Embeds in form-layout as a color field
- Pairs with theming system for brand color selection
- Swatch grid variant useful for Badge/tag color assignment
