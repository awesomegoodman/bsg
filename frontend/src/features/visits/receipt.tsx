'use client';
import { useState } from 'react';
import { Check, Clock3, Copy } from 'lucide-react';
import type { VisitReceipt } from '@diaspora/shared';
import { PrimaryButton } from '@/components/ui';

export function Receipt({
  receipt,
  checkoutTime,
  timeZone,
  onDone,
}: {
  receipt?: VisitReceipt;
  checkoutTime?: string;
  timeZone: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const date = new Date(checkoutTime ?? receipt!.signedInAt);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .toUpperCase();
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
  return (
    <section aria-labelledby="receipt-title">
      <h2 id="receipt-title" className="page-title" tabIndex={-1}>
        {checkoutTime ? 'You’re Checked Out!' : 'You’re Checked In!'}
      </h2>
      <p className="page-subtitle">
        {checkoutTime
          ? 'Thank you for visiting Diaspora Insurance.'
          : 'Your visit has been successfully recorded.'}
      </p>
      <div className="success-symbol" aria-hidden="true">
        <Check size={22} />
      </div>
      <div className="receipt-card">
        {receipt && (
          <>
            <p className="text-xs uppercase text-muted">Visitor</p>
            <h3 className="mt-3 text-2xl">
              {receipt.firstName} {receipt.lastName}
            </h3>
            <div className="receipt-rule" />
          </>
        )}
        <div className="receipt-details">
          <div className="flex gap-3">
            <Clock3 size={20} className="mt-1 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted">
                {checkoutTime ? 'Check-out time' : 'Check-in time'}
              </p>
              <p className="mt-2 font-semibold">
                <time dateTime={date.toISOString()}>
                  {time} · {day}
                </time>
              </p>
            </div>
          </div>
          {receipt && (
            <div className="min-w-0">
              <p className="text-sm text-muted">Confirmation reference</p>
              <p className="reference-text mt-2 font-semibold">
                {receipt.visitId}
              </p>
              <button
                className="text-button mt-3"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(receipt.visitId);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                <Copy size={14} aria-hidden="true" />
                {copied ? 'Copied' : 'Copy reference'}
              </button>
            </div>
          )}
        </div>
        <p className="mt-8 text-xs leading-5 text-muted">
          {checkoutTime
            ? 'Your departure has been recorded automatically.'
            : 'Automatically recorded at check-in. Keep your confirmation reference to check out.'}
        </p>
      </div>
      <PrimaryButton onClick={onDone} className="mt-6">
        Done
      </PrimaryButton>
      <p role="status" className="sr-only">
        {copied ? 'Confirmation reference copied.' : ''}
      </p>
    </section>
  );
}
