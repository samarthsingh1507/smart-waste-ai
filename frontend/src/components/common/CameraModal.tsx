import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setIsInitializing(true);
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment.');
      setIsInitializing(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Could not connect to camera device. You can upload an image file instead.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `waste_camera_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        onCapture(file);
        stopCamera();
        onClose();
      }
    }, 'image/jpeg', 0.9);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          stopCamera();
          onClose();
        }}
      />

      <div className="card-hover relative bg-white rounded-2xl shadow-2xl border border-warm-200 max-w-lg w-full overflow-hidden z-10">
        <div className="p-4 border-b border-warm-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-forest-50 text-forest-700 rounded-lg border border-forest-200 shadow-2xs">
              <Camera className="w-4 h-4 text-forest-700" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm">Kitchen Scale Camera Capture</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="btn-press text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-stone-950 flex flex-col items-center justify-center min-h-[320px] relative">
          {cameraError ? (
            <div className="p-6 text-center max-w-xs">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-white text-sm font-medium">{cameraError}</p>
              <button
                onClick={startCamera}
                className="btn-press mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white text-xs rounded-lg border border-stone-700 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : (
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-950/80 z-10 text-white text-sm">
                  Starting camera feed...
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[360px] rounded-lg object-contain shadow-md"
              />
              <div className="absolute bottom-3 text-[11px] text-stone-300 bg-stone-900/90 backdrop-blur-xs px-3 py-1 rounded-full pointer-events-none border border-stone-700 shadow-xs">
                Align food plate or prep container in frame
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-white flex items-center justify-between gap-3 border-t border-warm-200">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="btn-press px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 rounded-lg hover:bg-warm-100 transition-colors"
          >
            Cancel
          </button>

          {!cameraError && (
            <button
              type="button"
              onClick={capturePhoto}
              className="group btn-press btn-glow inline-flex items-center gap-2 px-5 py-2.5 bg-forest-700 hover:bg-forest-800 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
            >
              <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Capture Photo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
