import {
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from './Icons';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, optional, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required ? <span className="ml-1 text-accent-soft">*</span> : null}
        {optional ? <span className="ml-2 font-normal normal-case tracking-normal text-slate-faint">optional</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={htmlFor ? `${htmlFor}-help` : undefined} className="mt-1.5 text-xs leading-relaxed text-slate-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-1.5 flex items-start gap-1 text-xs text-danger" role="alert">
          <Icon name="warning" size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  fieldClassName?: string;
  small?: boolean;
  optional?: boolean;
}

export function TextInput({
  label,
  hint,
  error,
  fieldClassName,
  small,
  optional,
  required,
  id,
  className = '',
  ...rest
}: TextInputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const input = (
    <input
      id={inputId}
      className={`input ${small ? 'input-sm' : ''} ${error ? 'border-danger/60' : ''} ${className}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={hint || error ? `${inputId}-${error ? 'error' : 'help'}` : undefined}
      {...rest}
    />
  );
  if (!label) return input;
  return (
    <Field
      label={label}
      htmlFor={inputId}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={fieldClassName}
    >
      {input}
    </Field>
  );
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  fieldClassName?: string;
  optional?: boolean;
}

export function TextArea({ label, hint, error, fieldClassName, optional, id, className = '', ...rest }: TextAreaProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const input = (
    <textarea
      id={inputId}
      className={`input ${error ? 'border-danger/60' : ''} ${className}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={hint || error ? `${inputId}-${error ? 'error' : 'help'}` : undefined}
      {...rest}
    />
  );
  if (!label) return input;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} optional={optional} className={fieldClassName}>
      {input}
    </Field>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  options: SelectOption[];
  placeholder?: string;
  fieldClassName?: string;
  small?: boolean;
}

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  fieldClassName,
  small,
  id,
  className = '',
  ...rest
}: SelectProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const select = (
    <select
      id={inputId}
      className={`input appearance-none ${error ? 'border-danger/60' : ''} bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='12'%20height='12'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%237c7c92'%20stroke-width='2'%3E%3Cpath%20d='M6%209l6%206%206-6'/%3E%3C/svg%3E")] bg-[right_0.75rem_center] bg-no-repeat pr-8 ${
        small ? 'input-sm' : ''
      } ${className}`}
      {...rest}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  if (!label) return select;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} className={fieldClassName}>
      {select}
    </Field>
  );
}

export interface CheckboxProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ReactNode;
  disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, hint, disabled }: CheckboxProps) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 text-sm ${disabled ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-500 bg-ink-900 accent-accent-deep"
      />
      <span className="min-w-0">
        <span className="text-slate-text">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-slate-faint">{hint}</span> : null}
      </span>
    </label>
  );
}

export interface TagListInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hint?: ReactNode;
  /** Split input on commas (default) or treat the whole input as one entry. */
  maxItems?: number;
}

export function TagListInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxItems = 30,
}: TagListInputProps) {
  const [draft, setDraft] = useState('');
  const id = useId();

  const commit = () => {
    const added = draft
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!added.length) return;
    const next = [...value];
    for (const item of added) {
      if (!next.some((existing) => existing.toLowerCase() === item.toLowerCase()) && next.length < maxItems) {
        next.push(item);
      }
    }
    onChange(next);
    setDraft('');
  };

  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="rounded-xl border border-ink-600 bg-ink-900/80 p-2 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/25">
        {value.length ? (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {value.map((item) => (
              <li key={item}>
                <span className="chip">
                  {item}
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((existing) => existing !== item))}
                    className="rounded p-0.5 text-slate-faint hover:text-danger"
                    aria-label={`Remove ${item}`}
                  >
                    <Icon name="close" size={11} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commit();
            } else if (event.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          className="w-full border-0 bg-transparent px-1.5 py-1 text-sm text-slate-text placeholder:text-slate-faint/70 focus:outline-none"
          placeholder={placeholder ?? 'Type and press Enter'}
        />
      </div>
    </Field>
  );
}

export interface ChoiceChipsProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[] | readonly T[];
  value: T[];
  onChange: (value: T[]) => void;
  hint?: ReactNode;
  columns?: boolean;
}

export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
  columns = false,
}: ChoiceChipsProps<T>) {
  const normalized = (options as readonly (T | { value: T; label: string })[]).map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
  return (
    <Field label={label} hint={hint}>
      <div className={`flex flex-wrap gap-1.5 ${columns ? 'grid grid-cols-2' : ''}`} role="group" aria-label={label}>
        {normalized.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected ? value.filter((item) => item !== option.value) : [...value, option.value],
                )
              }
              className={`rounded-full border px-2.5 py-1 text-xs capitalize transition-colors ${
                selected
                  ? 'border-accent/50 bg-accent-dim text-accent-soft'
                  : 'border-ink-600 bg-ink-800 text-slate-muted hover:border-ink-500 hover:text-slate-text'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
