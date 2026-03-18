# CSS Modules & Styling

## Table of Contents
- [CSS Module Structure](#css-module-structure)
- [Style Override Pattern](#style-override-pattern)
- [Responsive Design](#responsive-design)
- [Global Style Composition](#global-style-composition)

---

## CSS Module Structure

Use CSS Modules with these conventions:

```css
@import '../../styles/customMediaQueries.css';

.root {
  /* Base component styles */
}

.rootVariant {
  composes: root;
  /* Variant-specific styles */
}

.element {
  /* Nested element styles */
}

.elementState {
  /* State-specific styles (e.g., .inputError, .buttonDisabled) */
}
```

### Class Naming

| Type | Convention | Example |
|------|------------|---------|
| Root class | `.root` | `.root` |
| Variant | `.rootVariantName` | `.rootSecondary` |
| Element | `.elementName` | `.title`, `.content` |
| State | `.elementState` | `.inputError`, `.buttonDisabled` |

---

## Style Override Pattern

Support style overrides via props:

```javascript
const classes = classNames(rootClassName || css.root, className, {
  [css.active]: isActive,
  [css.disabled]: isDisabled,
});
```

### Component Pattern

```javascript
const Component = props => {
  const { rootClassName, className, isActive } = props;

  const classes = classNames(rootClassName || css.root, className, {
    [css.active]: isActive,
  });

  return <div className={classes}>...</div>;
};

Component.defaultProps = {
  rootClassName: null,
  className: null,
};
```

---

## Responsive Design

Use custom media queries from `customMediaQueries.css`:

```css
/* Mobile first approach */
.root {
  /* Base mobile styles */
}

@media (--viewportSmall) {
  .root {
    /* min-width: 550px */
  }
}

@media (--viewportMedium) {
  .root {
    /* min-width: 768px */
  }
}

@media (--viewportLarge) {
  .root {
    /* min-width: 1024px */
  }
}

@media (--viewportMobile) {
  .root {
    /* max-width: 620px */
  }
}
```

### Available Breakpoints

| Query | Description |
|-------|-------------|
| `--viewportSmall` | min-width: 550px |
| `--viewportMedium` | min-width: 768px |
| `--viewportLarge` | min-width: 1024px |
| `--viewportMobile` | max-width: 620px |

---

## Global Style Composition

Use `composes` for extending global styles:

```css
.primaryButton {
  composes: buttonPrimary from global;
  /* Additional styles */
}

.heading {
  composes: marketplaceH1FontStyles from global;
  margin-bottom: 24px;
}
```

### Common Global Styles

```css
/* Typography */
composes: marketplaceH1FontStyles from global;
composes: marketplaceH2FontStyles from global;
composes: marketplaceBodyFontStyles from global;

/* Buttons */
composes: buttonPrimary from global;
composes: buttonSecondary from global;

/* Links */
composes: marketplaceLinkStyles from global;
```
