'use client';
import { useState, type FormEvent } from 'react';
import { checkInSchema, type VisitReceipt } from '@diaspora/shared';
import { api, RequestError } from '@/lib/api';
import { ErrorNotice, PrimaryButton } from '@/components/ui';

export function VisitorForm({
  onSuccess,
  csrfToken,
}: {
  onSuccess: (receipt: VisitReceipt) => void;
  csrfToken?: string;
}) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const rawPhone = String(data.get('phone') ?? '').trim();
    const country = String(data.get('country'));
    const phone = rawPhone.startsWith('+')
      ? rawPhone
      : country + (country === '+1' ? rawPhone : rawPhone.replace(/^0/, ''));
    const result = checkInSchema.safeParse({
      firstName: data.get('firstName'),
      lastName: data.get('lastName'),
      phone,
      email: String(data.get('email') ?? '').trim(),
    });
    setError('');
    setFields({});
    if (!result.success) {
      const nextFields = Object.fromEntries(
        result.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      );
      setFields(nextFields);
      (
        form.querySelector(
          `[name="${Object.keys(nextFields)[0]}"]`,
        ) as HTMLElement | null
      )?.focus();
      return;
    }
    setPending(true);
    try {
      onSuccess(
        await api<VisitReceipt>(
          csrfToken ? '/api/staff/visits' : '/api/visits/check-in',
          {
            method: 'POST',
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
            body: JSON.stringify(result.data),
          },
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not save this visit.',
      );
      if (error instanceof RequestError && error.fields)
        setFields(error.fields);
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      noValidate
      className="visitor-form"
      aria-label={csrfToken ? 'Register a visitor' : 'Visitor check-in'}
    >
      <div className="form-grid">
        {(['firstName', 'lastName'] as const).map((name) => (
          <div key={name}>
            <label htmlFor={name}>
              {name === 'firstName' ? 'First Name' : 'Last Name'}
              <span className="required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id={name}
              name={name}
              type="text"
              autoComplete={name === 'firstName' ? 'given-name' : 'family-name'}
              placeholder={
                name === 'firstName' ? 'Enter first name' : 'Enter last name'
              }
              maxLength={80}
              required
              aria-invalid={Boolean(fields[name])}
              aria-describedby={fields[name] ? `${name}-error` : undefined}
              disabled={pending}
            />
            {fields[name] && (
              <p className="field-error" id={`${name}-error`}>
                {fields[name]}
              </p>
            )}
          </div>
        ))}
        <div>
          <label htmlFor="phone">
            Phone Number
            <span className="required" aria-hidden="true">
              *
            </span>
          </label>
          <div className={`phone-control ${fields.phone ? 'invalid' : ''}`}>
            <select
              name="country"
              aria-label="Country calling code"
              defaultValue="+1"
              disabled={pending}
            >
              <option value="+1">🇺🇸 +1</option>
              <option value="+234">🇳🇬 +234</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+27">🇿🇦 +27</option>
              <option value="+233">🇬🇭 +233</option>
              <option value="+254">🇰🇪 +254</option>
              <option value="+353">🇮🇪 +353</option>
              <option value="+61">🇦🇺 +61</option>
            </select>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              placeholder="(555) 000-0000"
              maxLength={30}
              required
              aria-invalid={Boolean(fields.phone)}
              aria-describedby={fields.phone ? 'phone-error' : undefined}
              disabled={pending}
            />
          </div>
          {fields.phone && (
            <p className="field-error" id="phone-error">
              {fields.phone}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="email">
            Email Address<span className="sr-only"> (optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            maxLength={120}
            aria-invalid={Boolean(fields.email)}
            aria-describedby={fields.email ? 'email-error' : undefined}
            disabled={pending}
          />
          {fields.email && (
            <p className="field-error" id="email-error">
              {fields.email}
            </p>
          )}
        </div>
      </div>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <PrimaryButton type="submit" pending={pending}>
        {pending
          ? 'Recording your visit…'
          : csrfToken
            ? 'Register Visitor'
            : 'Complete Check-In'}
      </PrimaryButton>
      <p className="privacy-copy">
        Your details are used to administer your visit.{' '}
        <span>
          Required fields are marked <span aria-hidden="true">*</span>
          <span className="sr-only">with an asterisk</span>.
        </span>
      </p>
    </form>
  );
}
