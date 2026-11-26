import Link from 'next/link';
import { Logo, WelcomeCopy } from '@/components/brand';

export default function WelcomePage() {
  return (
    <main id="main" className="onboarding pattern">
      <div className="onboarding-inner">
        <Logo />
        <WelcomeCopy />
        <nav className="segmented" aria-label="Start your visit">
          <Link href="/check-in" className="selected">
            Check In
          </Link>
          <Link href="/check-out">Check Out</Link>
        </nav>
      </div>
      <div className="onboarding-rule" />
    </main>
  );
}
