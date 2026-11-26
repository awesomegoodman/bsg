import Link from 'next/link';
import { UserRound } from 'lucide-react';

export function DeskNavigation({
  mode,
  staff = false,
}: {
  mode: 'check-in' | 'check-out';
  staff?: boolean;
}) {
  return (
    <nav className="desk-navigation" aria-label="Visitor navigation">
      <div className="segmented">
        <Link
          href="/check-in"
          aria-current={mode === 'check-in' && !staff ? 'page' : undefined}
        >
          Check In
        </Link>
        <Link
          href="/check-out"
          aria-current={mode === 'check-out' ? 'page' : undefined}
        >
          Check Out
        </Link>
      </div>
      {!staff && (
        <Link href="/staff" className="staff-link">
          <UserRound size={18} aria-hidden="true" />
          Register a Visitor
        </Link>
      )}
      {staff && (
        <Link href="/check-in" className="staff-link">
          Visitor check-in
        </Link>
      )}
    </nav>
  );
}
