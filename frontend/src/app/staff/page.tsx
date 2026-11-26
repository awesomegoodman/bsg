import type { Metadata } from 'next';
import { DeskShell } from '@/components/desk-shell';
import { StaffDesk } from '@/features/visits/staff-desk';
export const metadata: Metadata = { title: 'Register a Visitor' };
export default function StaffPage() {
  return (
    <DeskShell>
      <StaffDesk />
    </DeskShell>
  );
}
