# Sacavia Brand Color Palette Guide

## Overview
Sacavia's earth-tone color palette draws inspiration from the natural landscapes that Sacagawea would have known - warm browns, rich terraces, sage greens, and sandy tans. These colors create a sophisticated, grounded aesthetic that honors Native American heritage while maintaining modern appeal.

## Core Brand Colors

### Primary Earth Tones
- **Saddle Brown** (`--sacavia-saddle-brown: #8B4513`) - Primary brand color, used for headers, buttons, and key elements
- **Tan** (`--sacavia-tan: #D2B48C`) - Secondary color, perfect for backgrounds and subtle accents
- **Terracotta** (`--sacavia-terracotta: #CD853F`) - Accent color for highlights and interactive elements

### Supporting Earth Tones
- **Burnt Sienna** (`--sacavia-burnt-sienna: #CC5500`) - For warnings, emphasis, and warm accents
- **Sage Green** (`--sacavia-sage: #9CAF88`) - Natural green for success states and nature-themed elements
- **Clay** (`--sacavia-clay: #B07142`) - Rich brown for secondary buttons and dividers
- **Sand** (`--sacavia-sand: #F4E4BC`) - Light background color for cards and sections
- **Stone** (`--sacavia-stone: #8A8680`) - Muted text and icon color
- **Copper** (`--sacavia-copper: #B87333`) - Metallic accent for premium features
- **Moss** (`--sacavia-moss: #5F7A61`) - Deep green for footer and nature elements

## CSS Variable Integration

The color system seamlessly integrates with your existing CSS variables:

```css
/* Primary brand colors are now earth-toned */
--primary: var(--sacavia-saddle-brown);
--secondary: lightened tan tones;
--accent: terracotta variations;

/* All system colors have warm undertones */
--background: cream white with earth undertones;
--foreground: deep brown text;
--border: warm gray borders;
```

## Utility Classes

### Background Colors
```css
.bg-sacavia-primary    /* Saddle brown backgrounds */
.bg-sacavia-secondary  /* Tan backgrounds */
.bg-sacavia-accent     /* Terracotta backgrounds */
.bg-sacavia-sage       /* Sage green backgrounds */
.bg-sacavia-sand       /* Sand/cream backgrounds */
```

### Text Colors
```css
.text-sacavia-primary   /* Dark brown text */
.text-sacavia-accent    /* Terracotta text */
.text-sacavia-sage      /* Sage green text */
.text-sacavia-copper    /* Copper text for highlights */
```

### Gradients
```css
.bg-gradient-sacavia       /* Primary brand gradient */
.bg-gradient-sacavia-warm  /* Warm earth gradient */
.bg-gradient-sacavia-earth /* Natural green to sand gradient */
```

### Branded Components
```css
.btn-sacavia-primary    /* Primary brand button */
.btn-sacavia-secondary  /* Secondary button with tan background */
.btn-sacavia-outline    /* Outline button with brand colors */
.shadow-sacavia         /* Branded shadow effects */
```

### Patterns
```css
.pattern-sacavia-diamonds  /* Subtle diamond pattern background */
.pattern-sacavia-mountains /* Mountain-inspired pattern */
```

## Color Combinations That Work Well

### High Contrast Combinations
- **Saddle Brown** on **Sand** backgrounds
- **White** text on **Saddle Brown** backgrounds
- **Terracotta** accents on **Sand** backgrounds

### Subtle Combinations
- **Stone** text on **Sand** backgrounds
- **Sage** accents on **Sand** backgrounds
- **Clay** borders with **Tan** backgrounds

### Interactive States
- **Terracotta** hover states
- **Saddle Brown** focus rings
- **Clay** active states

## Dark Mode Adaptations

All colors have carefully crafted dark mode variants:
- Backgrounds become rich dark browns
- Text becomes warm off-whites
- Colors are brightened and adjusted for dark backgrounds
- Contrast ratios are maintained for accessibility

## Usage Examples

### Navigation
```jsx
<nav className="bg-sacavia-primary text-white shadow-sacavia">
  <button className="btn-sacavia-secondary">Login</button>
</nav>
```

### Cards
```jsx
<div className="bg-sacavia-sand border-sacavia-secondary rounded-lg shadow-sacavia">
  <h3 className="text-sacavia-primary">Card Title</h3>
  <p className="text-sacavia-stone">Card content</p>
</div>
```

### Buttons
```jsx
<button className="btn-sacavia-primary">Primary Action</button>
<button className="btn-sacavia-outline">Secondary Action</button>
```

### Backgrounds with Patterns
```jsx
<section className="bg-sacavia-sand pattern-sacavia-diamonds">
  <div className="bg-gradient-sacavia-warm p-8 rounded-lg">
    Content with subtle earth-tone gradients
  </div>
</section>
```

## Brand Benefits

1. **Cohesive Identity**: All colors work harmoniously together
2. **Cultural Sensitivity**: Honors Native American heritage through natural earth tones
3. **Modern Appeal**: Sophisticated palette that feels contemporary
4. **Accessibility**: Maintains proper contrast ratios in both light and dark modes
5. **Flexibility**: Can be used subtly or boldly depending on the context
6. **Warmth**: Creates an inviting, trustworthy feeling
7. **Uniqueness**: Distinguishes Sacavia from other apps with typical blue/tech color schemes

## Technical Notes

- All colors are defined in HSL format for easy manipulation
- Variables allow for consistent theming across the entire application
- Dark mode variants are automatically handled
- Colors integrate seamlessly with Tailwind CSS
- Optimized for both web and mobile experiences 