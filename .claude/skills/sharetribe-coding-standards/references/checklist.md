# Quick Reference Checklist

Before completing any Sharetribe code task, verify:

---

## Component Checklist

- [ ] Component follows container/presentational separation
- [ ] File structure matches established patterns
- [ ] Naming conventions are correct (PascalCase, camelCase, etc.)
- [ ] CSS uses modules with proper class naming
- [ ] Components support `rootClassName`/`className` overrides
- [ ] `displayName` is set for exported components

---

## Form Checklist

- [ ] Forms use React Final Form with Field components
- [ ] Validators return `undefined` for success, message for error
- [ ] Form fields use `Field[Type]` naming convention

---

## Redux Checklist

- [ ] Redux follows Ducks pattern with proper action types (`app/feature/ACTION`)
- [ ] Reducer is default export, action creators are named exports
- [ ] New global ducks registered in `src/ducks/index.js`
- [ ] New page ducks registered in `src/containers/reducers.js`
- [ ] Selectors defined for accessing state
- [ ] Thunks use Request/Success/Error pattern

---

## API Checklist

- [ ] Server endpoints created in `server/api/` directory
- [ ] Routes registered in `server/apiRouter.js`
- [ ] Client functions added to `src/util/api.js`
- [ ] Transit serialization used for API communication
- [ ] Pagination implemented for list endpoints

---

## Page/Container Checklist

- [ ] loadData function created for server-side data fetching
- [ ] loadData registered in `src/containers/pageDataLoadingAPI.js`
- [ ] Error handling implemented with `storableError`
- [ ] Loading and error states handled in UI

---

## i18n Checklist

- [ ] User-facing text uses React Intl
- [ ] Message IDs follow `PageName.section.element` convention
- [ ] No hard-coded strings for user-visible content

---

## General Checklist

- [ ] Read existing code before making changes
- [ ] Use existing utility functions from `src/util/`
- [ ] Error handling is implemented for async operations
- [ ] No inline styles for reusable components
