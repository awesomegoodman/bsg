'use client';
import { useState, type FormEvent } from 'react';
import { checkOutSchema } from '@diaspora/shared';
import { api } from '@/lib/api';
import { ErrorNotice, PrimaryButton } from '@/components/ui';

export function CheckoutForm({
  reference,
  onSuccess,
}: {
  reference: string;
  onSuccess: (time: string) => void;
}) {
  const [value, setValue] = useState(reference);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const result = checkOutSchema.safeParse({ visitId: value });
    if (!result.success) {
      setError('Enter the confirmation reference you received at check-in.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const response = await api<{ signedOutAt: string }>(
        '/api/visits/check-out',
        { method: 'POST', body: JSON.stringify(result.data) },
      );
      onSuccess(response.signedOutAt);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not check out.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="visitor-form"
      aria-label="Visitor check-out"
      noValidate
    >
      <div>
        <label htmlFor="visitId">
          Confirmation reference
          <span className="required" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="visitId"
          name="visitId"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          maxLength={80}
          placeholder="DI-… or VST-…"
          disabled={pending}
          aria-describedby="reference-help"
        />
        <p id="reference-help" className="mt-3 text-sm text-muted">
          Use the reference shown on your check-in confirmation. Reception can
          help if you’ve misplaced it.
        </p>
      </div>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <PrimaryButton type="submit" pending={pending}>
        {pending ? 'Recording your check-out…' : 'Complete Check-Out'}
      </PrimaryButton>
    </form>
  );
}
