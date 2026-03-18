# Form Handling Patterns

## Table of Contents
- [React Final Form Structure](#react-final-form-structure)
- [Field Components](#field-components)
- [Field Component Pattern](#field-component-pattern)
- [Validators](#validators)

---

## React Final Form Structure

Use React Final Form with this pattern:

```javascript
import { Form as FinalForm, FormSpy } from 'react-final-form';

const FormComponent = props => (
  <FinalForm
    {...props}
    render={fieldRenderProps => {
      const {
        handleSubmit,
        invalid,
        pristine,
        submitting,
      } = fieldRenderProps;

      const submitDisabled = invalid || pristine || submitting;

      return (
        <form onSubmit={e => {
          e.preventDefault();
          handleSubmit(e);
        }}>
          {/* Form fields */}
          <Button type="submit" disabled={submitDisabled}>
            Submit
          </Button>
        </form>
      );
    }}
  />
);
```

---

## Field Components

Use `Field[Type]` naming convention for form fields:

| Component | Purpose |
|-----------|---------|
| `FieldTextInput` | Text and textarea inputs |
| `FieldSelect` | Dropdown selections |
| `FieldCheckbox` | Single checkbox |
| `FieldCheckboxGroup` | Multiple checkboxes |
| `FieldRadioButton` | Radio options |
| `FieldDatePicker` | Date selection |
| `FieldCurrencyInput` | Currency values |
| `FieldPhoneNumberInput` | Phone numbers (E.164 format) |

---

## Field Component Pattern

```javascript
import { Field } from 'react-final-form';

const FieldComponentName = props => {
  const {
    rootClassName,
    className,
    id,
    label,
    input,
    meta,
    ...rest
  } = props;

  const { valid, invalid, touched, error } = meta;
  const hasError = touched && invalid && error;

  return (
    <div className={classNames(rootClassName || css.root, className)}>
      {label && <label htmlFor={id}>{label}</label>}
      <input {...input} {...rest} id={id} />
      {hasError && <span className={css.error}>{error}</span>}
    </div>
  );
};

const FieldInput = props => <Field component={FieldComponentName} {...props} />;
export default FieldInput;
```

---

## Validators

Validators return `undefined` for success or error message for failure:

```javascript
// From util/validators.js
export const required = message => value => {
  if (typeof value === 'undefined' || value === null) {
    return message;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0 ? undefined : message;
  }
  return undefined;
};

// Usage
<FieldTextInput
  validate={required('This field is required')}
/>
```

### Common Validators

```javascript
// Email validator
export const emailFormat = message => value => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? undefined : message;
};

// Min length
export const minLength = (message, minLen) => value => {
  return value && value.length >= minLen ? undefined : message;
};

// Max length
export const maxLength = (message, maxLen) => value => {
  return !value || value.length <= maxLen ? undefined : message;
};

// Compose validators
export const composeValidators = (...validators) => value =>
  validators.reduce((error, validator) => error || validator(value), undefined);

// Usage
<FieldTextInput
  validate={composeValidators(
    required('Email is required'),
    emailFormat('Invalid email format')
  )}
/>
```
