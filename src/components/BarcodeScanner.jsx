import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

/**
 * Kamera-basierter Barcode-/QR-Scanner.
 * Ruft onDetect(text) beim ersten Treffer auf.
 *
 * Hinweis: USB-/Bluetooth-Scanner mit Tastatur-Emulation brauchen diese
 * Komponente nicht – sie "tippen" den Code direkt in ein fokussiertes Feld.
 */
export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let cancelled = false

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err, controls) => {
        if (cancelled) return
        controlsRef.current = controls
        if (result) {
          controls.stop()
          onDetect(result.getText())
        }
      })
      .catch((e) => {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Kamerazugriff verweigert. Bitte Berechtigung erteilen.'
            : 'Kamera konnte nicht gestartet werden: ' + (e?.message ?? e)
        )
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [onDetect])

  return (
    <div>
      {error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="scanner-view">
          <video ref={videoRef} muted playsInline />
        </div>
      )}
      <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.6rem' }}>
        Barcode/QR vor die Kamera halten. USB-/Bluetooth-Scanner funktionieren
        auch direkt im Suchfeld.
      </p>
      <button onClick={onClose} style={{ width: '100%' }}>
        Abbrechen
      </button>
    </div>
  )
}
