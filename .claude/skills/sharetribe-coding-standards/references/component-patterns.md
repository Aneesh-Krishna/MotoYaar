# Component Patterns

## Table of Contents
- [File & Directory Structure](#file--directory-structure)
- [Naming Conventions](#naming-conventions)
- [Presentational Components](#presentational-components)
- [Container Components](#container-components)
- [Button Variants Pattern](#button-variants-pattern)

---

## File & Directory Structure

### Component Organization

```
src/components/ComponentName/
├── ComponentName.js              # Main component
├── ComponentName.module.css      # Scoped CSS styles
├── ComponentName.example.js      # Storybook example (optional)
└── ComponentName.test.js         # Unit tests (optional)
```

### Container (Page) Organization

```
src/containers/PageName/
├── PageName.js                   # Main container component
├── PageName.duck.js              # Redux state (actions, reducer, selectors)
├── PageName.module.css           # Scoped styles
└── SubComponent/                 # Page-specific sub-components
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `PrimaryButton`, `FieldTextInput` |
| Component Files | PascalCase.js | `Button.js`, `AuthenticationPage.js` |
| CSS Modules | PascalCase.module.css | `Button.module.css` |
| Duck Files | featureName.duck.js | `auth.duck.js`, `stripe.duck.js` |
| Action Types | SCREAMING_SNAKE_CASE | `LOGIN_REQUEST`, `LOGIN_SUCCESS` |
| Functions | camelCase | `handleSubmit`, `pickRenderableImages` |
| CSS Classes | camelCase | `.root`, `.inputError`, `.submitButton` |

---

## Presentational Components

Create presentational components with:
- Props destructuring at the top
- `rootClassName` and `className` props for style overrides
- `displayName` assignment
- PropTypes documentation

**Required Pattern:**

```javascript
const ComponentName = props => {
  const {
    rootClassName,
    className,
    // ... other props
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  return (
    <div className={classes}>
      {/* Component content */}
    </div>
  );
};

ComponentName.displayName = 'ComponentName';

ComponentName.defaultProps = {
  rootClassName: null,
  className: null,
};

ComponentName.propTypes = {
  rootClassName: string,
  className: string,
};

export default ComponentName;
```

---

## Container Components

Create container components with:
- Separation of `ComponentNameComponent` (logic) and connected export
- Redux `connect()` with `compose()` from 'redux'
- `mapStateToProps` for state access
- `mapDispatchToProps` for action dispatching (when needed)

**Required Pattern:**

```javascript
import { compose } from 'redux';
import { connect } from 'react-redux';

const PageNameComponent = props => {
  const { /* destructured props */ } = props;
  // Component logic
};

const mapStateToProps = state => {
  const { data, inProgress, error } = state.featureName || {};
  return { data, inProgress, error };
};

const PageName = compose(
  connect(mapStateToProps)
)(PageNameComponent);

export default PageName;
```

---

## Button Variants Pattern

Create button variants as named exports:

```javascript
export const PrimaryButton = props => <Button {...props} />;
export const SecondaryButton = props => <Button {...props} rootClassName={css.secondary} />;
export const InlineTextButton = props => <Button {...props} rootClassName={css.inline} />;

PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
InlineTextButton.displayName = 'InlineTextButton';
```
