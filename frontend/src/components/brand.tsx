import Image from 'next/image';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Diaspora Insurance — Peace of mind, guaranteed"
      width={104}
      height={111}
      priority
      className={compact ? 'brand-logo compact' : 'brand-logo'}
    />
  );
}

export function WelcomeCopy() {
  return (
    <div className="welcome-copy">
      <span className="eyebrow">The welcome desk</span>
      <h1>Welcome to Diaspora Insurance</h1>
      <div className="accent-line" />
      <p>
        We’re glad to have you here. Please check in to help us make your visit
        seamless.
      </p>
    </div>
  );
}
