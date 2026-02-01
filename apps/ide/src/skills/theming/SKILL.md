---
name: Theming
description: How to style your app with CSS variables
when_to_use: Every project - defines your visual identity
---

## How It Works

Components use CSS variables like `var(--primary)`. You define these in `src/index.css`.

**The cascade:**
1. `index.html` has fallback values (safety net)
2. Your `src/index.css` overrides them (your theme)
3. Components automatically use your values

## Required Variables

| Variable | What It Affects | Example Value |
|----------|-----------------|---------------|
| `--background` | Page background | `0 0% 100%` (white) |
| `--foreground` | Main text color | `0 0% 3.9%` (near black) |
| `--primary` | Buttons, links, accents | `210 100% 50%` (blue) |
| `--primary-foreground` | Text on primary | `0 0% 100%` (white) |
| `--secondary` | Secondary buttons | `0 0% 96.1%` (light gray) |
| `--secondary-foreground` | Text on secondary | `0 0% 9%` |
| `--muted` | Subtle backgrounds | `0 0% 96.1%` |
| `--muted-foreground` | Subtle text | `0 0% 45.1%` |
| `--accent` | Hover states | `0 0% 96.1%` |
| `--accent-foreground` | Text on accent | `0 0% 9%` |
| `--destructive` | Delete, error actions | `0 84.2% 60.2%` (red) |
| `--destructive-foreground` | Text on destructive | `0 0% 98%` |
| `--card` | Card backgrounds | `0 0% 100%` |
| `--card-foreground` | Card text | `0 0% 3.9%` |
| `--popover` | Dropdown backgrounds | `0 0% 100%` |
| `--popover-foreground` | Dropdown text | `0 0% 3.9%` |
| `--border` | All borders | `0 0% 89.8%` |
| `--input` | Input borders | `0 0% 89.8%` |
| `--ring` | Focus rings | `0 0% 3.9%` |
| `--radius` | Border radius | `0.5rem` |

**Values are HSL without `hsl()`** - the format is `hue saturation% lightness%`.

## Complete Theme Examples

### Clean Minimal (Default)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --radius: 0.5rem;
}
```

### Bold & Confident

```css
:root {
  --background: 55 100% 98%;
  --foreground: 0 0% 4%;
  --primary: 50 100% 53%;
  --primary-foreground: 0 0% 4%;
  --secondary: 45 50% 92%;
  --secondary-foreground: 0 0% 4%;
  --muted: 45 30% 90%;
  --muted-foreground: 0 0% 40%;
  --accent: 50 100% 53%;
  --accent-foreground: 0 0% 4%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --card: 55 100% 98%;
  --card-foreground: 0 0% 4%;
  --popover: 55 100% 98%;
  --popover-foreground: 0 0% 4%;
  --border: 0 0% 0%;
  --input: 0 0% 0%;
  --ring: 50 100% 53%;
  --radius: 0px;
}
```

### Ocean Blue

```css
:root {
  --background: 210 40% 98%;
  --foreground: 210 40% 10%;
  --primary: 210 100% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 20% 94%;
  --secondary-foreground: 210 40% 10%;
  --muted: 210 20% 94%;
  --muted-foreground: 210 20% 40%;
  --accent: 210 30% 90%;
  --accent-foreground: 210 40% 10%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --card: 0 0% 100%;
  --card-foreground: 210 40% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 210 40% 10%;
  --border: 210 20% 85%;
  --input: 210 20% 85%;
  --ring: 210 100% 50%;
  --radius: 0.75rem;
}
```

## Tips

1. **Pick 1-2 accent colors max** - too many colors looks chaotic
2. **Keep contrast high** - foreground should contrast with background
3. **--radius sets personality**: `0` = sharp/modern, `0.5rem` = balanced, `1rem+` = playful
4. **Test with Card and Button** - if those look good, most things will
