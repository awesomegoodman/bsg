import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DeskShell } from '@/components/desk-shell';
import { VisitDesk } from '@/features/visits/visit-desk';
export const metadata: Metadata = { title: 'Visitor Check-In' };
export default function CheckInPage() {
  return (
    <DeskShell>
      <Suspense fallback={<p role="status">Opening the welcome desk…</p>}>
        <VisitDesk mode="check-in" />
      </Suspense>
    </DeskShell>
  );
}
