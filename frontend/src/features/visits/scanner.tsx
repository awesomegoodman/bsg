'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { visitReferenceSchema } from '@diaspora/shared';

function readCode(text: string, mode: 'check-in' | 'check-out'): string | null {
  const reference = visitReferenceSchema.safeParse(text);
  if (mode === 'check-out' && reference.success) return reference.data;
  try {
    const url = new URL(text);
    if (url.origin !== window.location.origin || url.pathname !== `/${mode}`)
      return null;
    if (mode === 'check-out') {
      const parsed = visitReferenceSchema.safeParse(
        url.searchParams.get('reference'),
      );
      return parsed.success ? parsed.data : '';
    }
    return '';
  } catch {
    return null;
  }
}
export function CameraScanner({
  mode,
  onResult,
  onClose,
}: {
  mode: 'check-in' | 'check-out';
  onResult: (value: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState('Starting camera…');
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    const element = video.current;
    const permissionHint = window.setTimeout(() => {
      if (!disposed)
        setMessage(
          'Allow camera access in your browser, or close the scanner to enter your details manually.',
        );
    }, 10000);
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('No camera');
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (disposed || !element) return;
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' }, audio: false },
          element,
          (result) => {
            if (disposed || !result) return;
            const value = readCode(result.getText(), mode);
            if (value === null) {
              setMessage(
                'This is not a welcome desk QR code. Please try another code.',
              );
              return;
            }
            disposed = true;
            stop?.();
            onResult(value);
          },
        );
        stop = () => controls.stop();
        if (disposed) controls.stop();
        else
          setMessage('Camera active. Position the QR code inside the frame.');
      } catch {
        if (!disposed) {
          setError(true);
          setMessage(
            'We couldn’t access your camera. Check camera permissions, or close the scanner and enter your details manually.',
          );
        }
      } finally {
        window.clearTimeout(permissionHint);
      }
    }
    void start();
    return () => {
      disposed = true;
      window.clearTimeout(permissionHint);
      stop?.();
      const stream = element?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((track) => track.stop());
    };
  }, [mode, onResult]);
  return (
    <section className="camera-panel" aria-label="QR code scanner">
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="text-sm">
          {message}
        </p>
        <button
          className="icon-button shrink-0"
          aria-label="Close scanner"
          onClick={onClose}
          autoFocus
        >
          <X size={22} />
        </button>
      </div>
      {!error ? (
        <div className="camera-view">
          <video ref={video} muted playsInline aria-label="Camera preview" />
          <div className="camera-target" aria-hidden="true" />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center">
          <Camera size={48} aria-hidden="true" />
        </div>
      )}
      <p className="text-xs">Camera images stay on your device.</p>
    </section>
  );
}
