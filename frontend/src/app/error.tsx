'use client';
import { PrimaryButton } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-6"
    >
      <h1 className="text-3xl">We couldn’t open the welcome desk</h1>
      <p>Please try again, or ask reception for assistance.</p>
      <PrimaryButton onClick={reset}>Try again</PrimaryButton>
    </main>
  );
}
