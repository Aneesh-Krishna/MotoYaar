---
name: sharetribe-coding-standards
description: |
  Enforces Sharetribe FTW (Flex Template for Web) coding standards, patterns, and best practices.
  This skill MUST be applied automatically whenever Claude works on any Sharetribe project,
  including creating components, forms, pages, Redux state, styling, or any code modifications.
  Ensures consistency with established Sharetribe architectural patterns and conventions.

  Trigger keywords: sharetribe, ftw, marketplace, listing, transaction, booking,
  component, container, duck, redux, form, field, css module, page, route, intl, i18n,
  api endpoint, router, reducer, thunk, loadData, sdk, integration api, transit, serialization
---

# Sharetribe Coding Standards

This skill instructs Claude to behave as a **Sharetribe expert developer** who enforces
the established patterns, conventions, and best practices found in Sharetribe FTW codebases.

---

## Purpose

Treat all Sharetribe code as requiring:

- **Consistency** - Follow established patterns exactly as they exist in the codebase
- **Component Architecture** - Respect the container/presentational component separation
- **Redux Ducks Pattern** - Use the established state management structure
- **CSS Modules** - Apply scoped styling conventions
- **Form Patterns** - Use React Final Form with established field components
- **Internationalization** - Support i18n with React Intl patterns

---

## Quick Reference

| Task | Reference |
|------|-----------|
| Creating React components | [component-patterns.md](references/component-patterns.md) |
| Redux state management | [redux-patterns.md](references/redux-patterns.md) |
| Form handling | [forms-patterns.md](references/forms-patterns.md) |
| Server/client API integration | [api-patterns.md](references/api-patterns.md) |
| CSS and styling | [css-styling.md](references/css-styling.md) |
| Pre-completion checklist | [checklist.md](references/checklist.md) |

---

## Core Patterns Overview

### File Structure

**Components:**
```
src/components/ComponentName/
├── ComponentName.js
├── ComponentName.module.css
└── ComponentName.test.js (optional)
```

**Containers (Pages):**
```
src/containers/PageName/
├── PageName.js
├── PageName.duck.js
├── PageName.module.css
└── SubComponent/ (optional)
```

**Server API:**
```
server/
├── api/endpointName.js
├── api-util/sdk.js
└── apiRouter.js
```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `PrimaryButton` |
| CSS Modules | PascalCase.module.css | `Button.module.css` |
| Duck Files | featureName.duck.js | `auth.duck.js` |
| Action Types | SCREAMING_SNAKE_CASE | `LOGIN_REQUEST` |
| Functions | camelCase | `handleSubmit` |
| CSS Classes | camelCase | `.root`, `.inputError` |

---

## Essential Patterns

### Presentational Component

```javascript
const ComponentName = props => {
  const { rootClassName, className, ...rest } = props;
  const classes = classNames(rootClassName || css.root, className);

  return <div className={classes}>{/* content */}</div>;
};

ComponentName.displayName = 'ComponentName';
ComponentName.defaultProps = { rootClassName: null, className: null };
```

### Container Component

```javascript
import { compose } from 'redux';
import { connect } from 'react-redux';

const PageNameComponent = props => { /* component logic */ };

const mapStateToProps = state => ({
  data: state.featureName.data,
  inProgress: state.featureName.inProgress,
});

const PageName = compose(connect(mapStateToProps))(PageNameComponent);
export default PageName;
```

### Redux Duck (Minimal)

```javascript
// Action types
export const FETCH_REQUEST = 'app/featureName/FETCH_REQUEST';
export const FETCH_SUCCESS = 'app/featureName/FETCH_SUCCESS';
export const FETCH_ERROR = 'app/featureName/FETCH_ERROR';

// Initial state
const initialState = { data: null, inProgress: false, error: null };

// Reducer (default export)
export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case FETCH_REQUEST: return { ...state, inProgress: true, error: null };
    case FETCH_SUCCESS: return { ...state, inProgress: false, data: payload };
    case FETCH_ERROR: return { ...state, inProgress: false, error: payload };
    default: return state;
  }
}

// Action creators (named exports)
export const fetchRequest = () => ({ type: FETCH_REQUEST });
export const fetchSuccess = data => ({ type: FETCH_SUCCESS, payload: data });
export const fetchError = error => ({ type: FETCH_ERROR, payload: error });

// Thunk
export const fetchData = params => (dispatch, getState, sdk) => {
  dispatch(fetchRequest());
  return sdk.resource.query(params)
    .then(res => dispatch(fetchSuccess(res.data.data)))
    .catch(e => { dispatch(fetchError(storableError(e))); throw e; });
};
```

### React Final Form

```javascript
import { Form as FinalForm } from 'react-final-form';

const FormComponent = props => (
  <FinalForm
    {...props}
    render={({ handleSubmit, invalid, pristine, submitting }) => (
      <form onSubmit={e => { e.preventDefault(); handleSubmit(e); }}>
        {/* FieldTextInput, FieldSelect, etc. */}
        <Button type="submit" disabled={invalid || pristine || submitting}>
          Submit
        </Button>
      </form>
    )}
  />
);
```

### i18n Pattern

```javascript
import { useIntl, FormattedMessage } from '../../util/reactIntl';

const Component = () => {
  const intl = useIntl();
  const placeholder = intl.formatMessage({ id: 'Component.placeholder' });

  return (
    <div>
      <FormattedMessage id="Component.title" />
      <input placeholder={placeholder} />
    </div>
  );
};
```

---

## Registration Points

When creating new features, register in these files:

| What | Where |
|------|-------|
| Global reducers | `src/ducks/index.js` |
| Page reducers | `src/containers/reducers.js` |
| Page loadData | `src/containers/pageDataLoadingAPI.js` |
| API routes | `server/apiRouter.js` |
| API client functions | `src/util/api.js` |

---

## Behavioral Constraints

### MUST:

- Read existing code before making changes
- Follow exact patterns found in the codebase
- Use existing utility functions from `src/util/`
- Maintain container/component separation
- Use CSS Modules for all styling
- Support i18n for all user-facing text
- Handle loading and error states
- Include `displayName` for exported components
- Use `classNames` for conditional CSS
- Wrap errors with `storableError()` before dispatching
- Register new ducks in appropriate index files

### MUST NOT:

- Create inline styles for reusable components
- Use global CSS classes directly
- Skip form validation patterns
- Create new state management patterns
- Ignore established folder structure
- Hard-code user-facing strings
- Skip error handling in async operations
- Create components without `rootClassName`/`className` support
- Use different form libraries
- Create API endpoints outside `server/api/`
- Forget to register loadData for pages needing server-side data

---

## Detailed References

For complete patterns, examples, and templates:

- **React Components**: See [component-patterns.md](references/component-patterns.md) for presentational/container patterns, file structure, naming conventions, and button variants
- **Redux/Ducks**: See [redux-patterns.md](references/redux-patterns.md) for complete duck templates, thunk patterns, selectors, and reducer registration
- **Forms**: See [forms-patterns.md](references/forms-patterns.md) for React Final Form integration, field components, and validators
- **API Integration**: See [api-patterns.md](references/api-patterns.md) for server endpoints, router config, client functions, SDK setup, and error handling
- **Styling**: See [css-styling.md](references/css-styling.md) for CSS Module conventions, responsive breakpoints, and global composition
- **Checklist**: See [checklist.md](references/checklist.md) for pre-completion verification

---

## Activation

This skill applies automatically when:

- Working on any Sharetribe FTW project
- Creating new React components or pages
- Modifying Redux state management
- Working with forms and validation
- Writing CSS or styling code
- Adding new routes
- Integrating with APIs or SDK
- Adding internationalized content
- Creating server-side API endpoints
- Registering reducers or loadData functions

---

## Skill Priority

- **Takes precedence** over general React/JavaScript standards
- **Yields to** security-focused skills for vulnerability analysis
- **Complements** code-review and code-quality skills
- **Combines with** dotnet-coding-standards for backend work
- **Overrides** generic Express.js patterns for Sharetribe API patterns
