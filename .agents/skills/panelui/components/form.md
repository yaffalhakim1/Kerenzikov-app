# Form

Form state — values, validation and submission — with no form library underneath.

```tsx
import { Form } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Form } from '@/components/ui/form';
```

### Anatomy

```tsx
<Form form={form}>
  <Form.Field name="…">
    {(field) => (
      <Input
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        errorMessage={field.error}
      />
    )}
  </Form.Field>
</Form>
```

### Parts

- `Form.Field` — Binds one field's state (`value`, `error`, `touched`) to a render prop, and validates it on blur — or on every change, with `validateOn="change"`. A field from createForm is restricted to declared keys and carries its exact value type.

### Props

#### `FormProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `form` | `FormApi<any>` | **required** | — |
| `children` | `ReactNode` | — | — |

#### `TypedFormProps`

Extends `<T Record<string, any>>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `form` | `FormApi<T>` | **required** | — |
| `children` | `ReactNode` | — | — |

#### `FormFieldProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `name` | `string` | **required** | — |
| `validate` | `(value: any, values: any) => string \| undefined \| Promise<string \| undefined>` | — | — |
| `validateOn` | `'blur' \| 'change'` | — | Runs on blur, and always on submit. `'change'` also validates on every edit. |
| `children` | `(field: FormFieldRenderProps<any>) => ReactNode` | **required** | — |

#### `TypedFormFieldProps`

Extends `< T Record<string, any>, K extends keyof T, > extends UseFieldOptions<T, K>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `name` | `K` | **required** | — |
| `children` | `(field: FormFieldRenderProps<T[K]>) => ReactNode` | **required** | — |

### Example — Cross-field validation

`validate` on `useForm` is for rules that compare two fields — a single field's own rule belongs on its `Form.Field` instead.

```tsx
const form = useForm({
  defaultValues: { password: '', confirmPassword: '' },
  validate: (values) =>
    values.password !== values.confirmPassword
      ? { confirmPassword: 'Passwords must match' }
      : {},
  onSubmit: async (values) => {
    await changePassword(values);
  },
});
```

### Notes

### `useForm`

| Option | Type | Description |
| --- | --- | --- |
| `defaultValues` | `T` | The form's fields and their starting values. Read once, on the first render. Every field's `name` has to be a key of it. |
| `validate` | `(values: T) => FieldErrors<T> \| Promise<FieldErrors<T>>` | Whole-form validation — a rule that compares two fields. Runs on submit. |
| `onSubmit` | `(values: T) => void \| Promise<void>` | Called with the current values once every field, and the whole form, pass validation. |

| Returns | Type | Description |
| --- | --- | --- |
| `values` / `errors` / `touched` | | Current state. |
| `isSubmitting` | `boolean` | True for the duration of an async `onSubmit`. |
| `isValid` | `boolean` | No field currently carries a recorded error. Validation runs on blur and submit, so this does not guarantee an untouched field would pass. |
| `isDirty` | `boolean` | `values` differs from `defaultValues`, compared as JSON. |
| `setFieldValue`, `setFieldTouched`, `setFieldError` | | Update one field directly — what `useField`'s `onChange`/`onBlur` call underneath. |
| `handleSubmit` | `() => Promise<void>` | Touches every field, runs every registered validator plus `validate`, and calls `onSubmit` only if none of them produced an error. |
| `reset` | `(values?: T) => void` | Clears errors and touched state, and restores `values` — `defaultValues` if none given. |

### `useField` and `Form.Field`

Each field registers its `validate` function with the form on mount, so `handleSubmit` can run every field's rule even for a field the user never touched. `useField(form, name, options)` returns `{ value, error, touched, onChange, onBlur }` — spread the pieces a control needs onto its own props. Which prop that is (`onChangeText`, `onCheckedChange`, `onValueChange`, …) is the reason this is a hook rather than a component that clones its child: only the caller knows which one a given control takes.

The compatibility `Form`/`Form.Field` API remains unbound for existing call sites. For end-to-end JSX typing, create a bound component once with `const SignUpForm = createForm<SignUpValues>()`, then call `SignUpForm.useForm(...)` and render `SignUpForm.Field`. Field names are limited to the flat keys in `SignUpValues`; each validator and render prop receives that key's value type, while `values`, `errors`, `setFieldValue`, `getValue`, `watch`, and `onSubmit` keep the complete shape.

`getValue(name)` reads the latest imperative value, including an edit made before React's next render. `watch(name)` reads from the current render, so a component calling it naturally follows form renders. Both accept only declared flat keys.

A field's `name` has to be a key of `defaultValues`, including the empty ones — `''` for text, `false` for a toggle. `defaultValues` is what declares the fields, and a name it does not declare has no value to hand a validator and nothing to submit. `Form.Field` cannot catch that in the types, so it warns in development instead; the typed `useField(form, name)` rejects it outright.

### When a validator throws

A rule is reached from a path nothing awaits — blur fires and forgets, and `handleSubmit` is usually wired straight to a press — so a throw inside one would surface as an unhandled rejection: a red box naming neither the field nor the rule.

Instead it is caught, logged to the console against the field by name, and counted as a failure. Counted rather than waved through, because a rule that crashed reached no verdict, and a form that submits past a rule that never ran puts unchecked values somewhere they cannot be taken back from. The field shows a placeholder message until the rule is fixed. A form-level `validate` that throws blocks the submit the same way, without marking any one field — it belongs to none of them.

### Scope

Values are flat and JSON-serializable — string, number, boolean, and plain arrays/objects of those. There is no field-array helper in this version; model a repeating group with your own `useState` array of row ids and one `useForm` per row, or key a field's name with an index (`"emails.0"`) and treat it as an opaque string.

See [Field](/docs/components/field) for the layout primitives — `Field.Label`, `Field.Error` and the rest — used to lay a field out when a control's own `label`/`description`/`errorMessage` props aren't enough.

---

Full page, with every example: https://panelui.dev/docs/form/form
