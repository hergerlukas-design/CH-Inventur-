import { useEffect, useRef } from 'react'
import bwipjs from 'bwip-js'

/**
 * Rendert einen Barcode (Code128) als Canvas – für Anzeige und Druck.
 * Druck läuft über den normalen Browser-Druckdialog (Dymo LabelManager
 * kann Barcodes als Bild drucken). Native DYMO-SDK ist Phase 2.
 */
export default function BarcodeLabel({ value, text, scale = 3, height = 12 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!value || !canvasRef.current) return
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: 'code128',
        text: value,
        scale,
        height,
        includetext: true,
        textxalign: 'center',
        textsize: 8,
        backgroundcolor: 'FFFFFF',
      })
    } catch (e) {
      console.error('Barcode konnte nicht gerendert werden:', e)
    }
  }, [value, scale, height])

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ background: '#fff', padding: '0.5rem', borderRadius: 8, display: 'inline-block' }}>
        <canvas ref={canvasRef} />
        {text && (
          <div style={{ color: '#000', fontSize: '0.7rem', marginTop: 2 }}>{text}</div>
        )}
      </div>
    </div>
  )
}

/** Öffnet ein Druckfenster mit einem einzelnen Label. */
export function printBarcode(value, label) {
  const canvas = document.createElement('canvas')
  try {
    bwipjs.toCanvas(canvas, {
      bcid: 'code128',
      text: value,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center',
    })
  } catch (e) {
    alert('Barcode konnte nicht erzeugt werden: ' + e.message)
    return
  }
  const dataUrl = canvas.toDataURL('image/png')
  const win = window.open('', '_blank', 'width=400,height=300')
  if (!win) return
  win.document.write(`
    <html><head><title>Etikett drucken</title>
    <style>
      body { margin:0; display:flex; flex-direction:column; align-items:center;
             justify-content:center; height:100vh; font-family:sans-serif; }
      img { max-width:90%; }
      .lbl { font-size:12px; margin-top:4px; }
      @media print { .noprint { display:none; } }
    </style></head>
    <body>
      <img src="${dataUrl}" />
      ${label ? `<div class="lbl">${label}</div>` : ''}
      <button class="noprint" onclick="window.print()" style="margin-top:16px;padding:8px 16px;">Drucken</button>
    </body></html>`)
  win.document.close()
  win.focus()
}
