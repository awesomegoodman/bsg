import Link from 'next/link';
export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-6"
    >
      <h1 className="text-3xl">Page not found</h1>
      <p>Return to the welcome desk to check in or out.</p>
      <Link href="/" className="primary-button">
        Welcome desk
      </Link>
    </main>
  );
}
