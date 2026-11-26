import Link from 'next/link';
import { Logo, WelcomeCopy } from './brand';

export function DeskShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="desk-shell">
      <aside className="brand-panel pattern">
        <Link href="/" aria-label="Welcome desk home">
          <Logo />
        </Link>
        <WelcomeCopy />
        <div className="brand-rule" />
      </aside>
      <header className="compact-header pattern">
        <Link href="/" aria-label="Welcome desk home">
          <Logo compact />
        </Link>
        <div className="sm:hidden">
          <p className="font-semibold">Welcome to Diaspora Insurance</p>
          <p className="mt-1 text-xs text-white/70">
            Your trusted insurance partner.
          </p>
        </div>
      </header>
      <main id="main" className="desk-content">
        <div className="mb-6 hidden sm:block lg:hidden">
          <p className="font-semibold text-[#56382e]">
            Welcome to Diaspora Insurance
          </p>
          <p className="mt-1 text-sm text-muted">
            Your trusted insurance partner.
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
