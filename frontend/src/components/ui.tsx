import type { ButtonHTMLAttributes } from 'react';
import { LoaderCircle, CircleAlert } from 'lucide-react';

export function PrimaryButton({
  children,
  pending,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className={`primary-button ${props.className ?? ''}`}
      aria-busy={pending || undefined}
    >
      {pending && (
        <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
export function ErrorNotice({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="error-notice">
      <CircleAlert size={20} className="shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
