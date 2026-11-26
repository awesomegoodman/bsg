'use client';
import { useEffect, useState } from 'react';
import type {
  StaffSession,
  PublicConfig,
  VisitReceipt,
} from '@diaspora/shared';
import { api, RequestError } from '@/lib/api';
import { ErrorNotice, PrimaryButton } from '@/components/ui';
import { DeskNavigation } from './desk-navigation';
import { VisitorForm } from './visitor-form';
import { Receipt } from './receipt';

export function StaffDesk() {
  const [session, setSession] = useState<StaffSession>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<PublicConfig>();
  const [receipt, setReceipt] = useState<VisitReceipt>();
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([
      api<PublicConfig>('/api/config'),
      api<StaffSession>('/api/staff/session').catch((error) => {
        if (error instanceof RequestError && error.status === 401)
          return undefined;
        throw error;
      }),
    ])
      .then(([settings, staff]) => {
        if (!active) return;
        setConfig(settings);
        setSession(staff);
        if (new URLSearchParams(window.location.search).has('authError')) {
          setError(
            'Sign-in could not be completed. Use an authorised reception Google account and try again.',
          );
          window.history.replaceState(null, '', '/staff');
        }
      })
      .catch((error: unknown) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : 'Could not load your session.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (receipt) document.getElementById('receipt-title')?.focus();
  }, [receipt]);
  async function logout() {
    setPending(true);
    setError('');
    try {
      await api('/api/staff/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': session!.csrfToken },
        body: '{}',
      });
      setSession(undefined);
      setReceipt(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not sign out.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <DeskNavigation mode="check-in" staff />
      <div className="desk-body">
        {loading ? (
          <p role="status" className="py-12 text-muted">
            Checking reception access…
          </p>
        ) : (
          <>
            {error && <ErrorNotice>{error}</ErrorNotice>}
            {session ? (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="break-all text-muted">
                    Signed in as {session.email}
                  </span>
                  <button
                    className="text-button"
                    onClick={logout}
                    disabled={pending}
                  >
                    {pending ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
                {receipt ? (
                  <Receipt
                    receipt={receipt}
                    timeZone={config?.timeZone ?? 'Africa/Lagos'}
                    onDone={() => setReceipt(undefined)}
                  />
                ) : (
                  <>
                    <h2 className="page-title">Register a Visitor</h2>
                    <p className="page-subtitle mb-10">
                      Enter your visitor’s details to record their arrival.
                    </p>
                    <VisitorForm
                      csrfToken={session.csrfToken}
                      onSuccess={setReceipt}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <h2 className="page-title">Reception Access</h2>
                <p className="page-subtitle">
                  Sign in with an authorised Google account to register a
                  visitor.
                </p>
                <div className="mt-10 rounded-2xl bg-surface p-7">
                  <h3 className="text-xl">A warm welcome starts here</h3>
                  <p className="mt-4 text-sm leading-6 text-muted">
                    Reception staff can check visitors in on their behalf.
                    Access is limited to authorised reception staff.
                  </p>
                  {config?.staffSignInAvailable ? (
                    <a className="primary-button mt-8" href="/auth/google">
                      Continue with Google
                    </a>
                  ) : (
                    <p role="status" className="mt-6 text-sm leading-6">
                      Staff sign-in is currently unavailable. Please contact
                      your administrator.
                    </p>
                  )}
                </div>
                <PrimaryButton
                  className="mt-6"
                  onClick={() => {
                    setLoading(true);
                    setError('');
                    setAttempt((value) => value + 1);
                  }}
                >
                  Check access again
                </PrimaryButton>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
