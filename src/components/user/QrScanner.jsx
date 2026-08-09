import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { X, Camera, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QrScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanningRef = useRef(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream = null;
    let animationFrame = null;

    const startScanner = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Seu navegador não suporta acesso à câmera. Digite a chave manualmente.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();
          scanLoop();
        }
      } catch (e) {
        setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      }
    };

    const scanLoop = () => {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          scanningRef.current = false;
          onScan(code.data);
          return;
        }
      }

      animationFrame = requestAnimationFrame(scanLoop);
    };

    startScanner();

    return () => {
      scanningRef.current = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-gold" /> Escanear QR Code
        </h3>
        <button onClick={onClose} className="text-white/80 hover:text-white p-2">
          <X className="w-6 h-6" />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <Camera className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/80 text-sm max-w-xs">{error}</p>
            <Button onClick={onClose} variant="outline" className="mt-6 text-white border-white/30 hover:bg-white/10">
              Digitar chave manualmente
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 max-w-[70vw] max-h-[70vw] relative">
                <div className="absolute inset-0 border-2 border-white/30 rounded-2xl" />
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-gold rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-gold rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-gold rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-gold rounded-br-lg" />
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gold/60 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="p-6 text-center bg-black/50">
            <p className="text-white/70 text-sm">Aponte a câmera para o QR Code</p>
          </div>
        </>
      )}
    </div>
  );
}