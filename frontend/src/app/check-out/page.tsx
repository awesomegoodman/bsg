import type { Metadata } from 'next';
import { DeskShell } from '@/components/desk-shell';
import { VisitDesk } from '@/features/visits/visit-desk';
export const metadata: Metadata = { title: 'Visitor Check-Out' };
export default function CheckOutPage() {
  return (
    <DeskShell>
      <VisitDesk mode="check-out" />
    </DeskShell>
  );
}
