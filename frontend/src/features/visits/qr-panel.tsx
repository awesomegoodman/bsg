'use client';
import Image from 'next/image';
import { useState } from 'react';
import { ScanLine, RefreshCw } from 'lucide-react';
import { CameraScanner } from './scanner';

export function QrPanel({
  mode,
  onScan,
}: {
  mode: 'check-in' | 'check-out';
  onScan: (value: string) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (scanning)
    return (
      <CameraScanner
        mode={mode}
        onResult={(value) => {
          setScanning(false);
          onScan(value);
        }}
        onClose={() => setScanning(false)}
      />
    );
  return (
    <div className="qr-panel">
      <div className="scan-card">
        <div className="scan-card-heading">
          <button
            type="button"
            className="scan-icon"
            aria-label="Open camera scanner"
            onClick={() => setScanning(true)}
          >
            <ScanLine size={26} aria-hidden="true" />
          </button>
          <h3>Scan to {mode === 'check-in' ? 'Check In' : 'Check Out'}</h3>
        </div>
        <p>
          Scan this QR code with your phone to{' '}
          {mode === 'check-in' ? 'get checked in' : 'check out'}.
        </p>
        <button className="scan-button" onClick={() => setScanning(true)}>
          <ScanLine size={16} aria-hidden="true" />
          Scan QR Code
        </button>
      </div>
      <div className="qr-image">
        {failed ? (
          <div
            role="status"
            className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm"
          >
            <p>QR code unavailable</p>
            <button
              className="text-button"
              onClick={() => {
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Try again
            </button>
            <p className="text-muted">You can enter your details below.</p>
          </div>
        ) : (
          <Image
            key={attempt}
            src={`/api/qr?mode=${mode}&v=${attempt}`}
            alt={`Scan to open visitor ${mode} on your phone`}
            width={260}
            height={260}
            unoptimized
            priority
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  );
}
