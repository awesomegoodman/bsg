'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PublicConfig, VisitReceipt } from '@diaspora/shared';
import { api } from '@/lib/api';
import { DeskNavigation } from './desk-navigation';
import { QrPanel } from './qr-panel';
import { VisitorForm } from './visitor-form';
import { CheckoutForm } from './checkout-form';
import { Receipt } from './receipt';

export function VisitDesk({ mode }: { mode: 'check-in' | 'check-out' }) {
  const [receipt, setReceipt] = useState<VisitReceipt>();
  const [checkoutTime, setCheckoutTime] = useState<string>();
  const [reference, setReference] = useState('');
  const [notice, setNotice] = useState('');
  const [timeZone, setTimeZone] = useState('Africa/Lagos');
  const router = useRouter();
  useEffect(() => {
    void api<PublicConfig>('/api/config')
      .then((config) => setTimeZone(config.timeZone))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (receipt || checkoutTime) {
      window.scrollTo({ top: 0 });
      document.getElementById('receipt-title')?.focus();
    }
  }, [receipt, checkoutTime]);
  const handleScan = useCallback(
    (value: string) => {
      setReference(value);
      setNotice(
        value
          ? 'Reference scanned. Confirm below to check out.'
          : 'Welcome desk QR code recognised. Please enter your details below.',
      );
      setTimeout(
        () =>
          document
            .getElementById(mode === 'check-in' ? 'firstName' : 'visitId')
            ?.focus(),
        0,
      );
    },
    [mode],
  );
  return (
    <>
      <DeskNavigation mode={mode} />
      <div className="desk-body">
        {receipt || checkoutTime ? (
          <Receipt
            receipt={receipt}
            checkoutTime={checkoutTime}
            timeZone={timeZone}
            onDone={() => {
              setReceipt(undefined);
              setCheckoutTime(undefined);
              router.push('/');
            }}
          />
        ) : (
          <>
            <h2 className="page-title">
              Visitor {mode === 'check-in' ? 'Check-In' : 'Check-Out'}
            </h2>
            <p className="page-subtitle">
              {mode === 'check-in'
                ? 'Please provide your details to register your visit.'
                : 'Enter your confirmation reference to complete your visit.'}
            </p>
            <QrPanel mode={mode} onScan={handleScan} />
            <div className="manual-divider">
              <span>
                or enter {mode === 'check-in' ? 'details' : 'reference'}{' '}
                manually
              </span>
            </div>
            {notice && (
              <p
                role="status"
                className="mb-5 rounded-xl bg-surface p-4 text-sm"
              >
                {notice}
              </p>
            )}
            {mode === 'check-in' ? (
              <VisitorForm onSuccess={setReceipt} />
            ) : (
              <CheckoutForm
                key={reference}
                reference={reference}
                onSuccess={setCheckoutTime}
              />
            )}
          </>
        )}
      </div>
      <footer className="mt-8 text-sm text-[#56382e] sm:hidden">
        <Link href="/staff" className="text-button">
          Register a Visitor
        </Link>
      </footer>
    </>
  );
}
