/**
 * useWebcamStream - Hook para captura de cámara y micrófono
 * Gestiona permisos, dispositivos y stream de media
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput';
}

interface UseWebcamStreamReturn {
  // Stream
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;

  // Estado
  isCapturing: boolean;
  hasPermission: boolean | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  audioLevel: number;
  error: Error | null;

  // Dispositivos
  cameras: MediaDevice[];
  microphones: MediaDevice[];
  selectedCamera: string | null;
  selectedMic: string | null;

  // Acciones
  startCapture: (constraints?: MediaStreamConstraints) => Promise<void>;
  stopCapture: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
  facingMode: 'user',
};

const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function useWebcamStream(): UseWebcamStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMic, setSelectedMic] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Enumerar dispositivos
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Cámara ${d.deviceId.slice(0, 5)}`,
          kind: 'videoinput' as const,
        }));

      const audioDevices = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Micrófono ${d.deviceId.slice(0, 5)}`,
          kind: 'audioinput' as const,
        }));

      setCameras(videoDevices);
      setMicrophones(audioDevices);

      // Seleccionar primeros dispositivos si no hay selección
      if (!selectedCamera && videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
      if (!selectedMic && audioDevices.length > 0) {
        setSelectedMic(audioDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, [selectedCamera, selectedMic]);

  // Solicitar permisos
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Detener tracks de prueba
      testStream.getTracks().forEach((track) => track.stop());

      setHasPermission(true);
      await enumerateDevices();
      return true;
    } catch (err) {
      console.error('Permission denied:', err);
      setHasPermission(false);
      setError(err instanceof Error ? err : new Error('Permission denied'));
      return false;
    }
  }, [enumerateDevices]);

  // Monitorear nivel de audio
  const startAudioMonitoring = useCallback((mediaStream: MediaStream) => {
    try {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (!audioTrack) return;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(
        new MediaStream([audioTrack])
      );
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.round((average / 255) * 100));
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.error('Error starting audio monitoring:', err);
    }
  }, []);

  // Detener monitoreo de audio
  const stopAudioMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Iniciar captura
  const startCapture = useCallback(
    async (constraints?: MediaStreamConstraints) => {
      try {
        setError(null);

        const videoConstraints = {
          ...DEFAULT_VIDEO_CONSTRAINTS,
          ...(selectedCamera ? { deviceId: { exact: selectedCamera } } : {}),
          ...(constraints?.video && typeof constraints.video === 'object'
            ? constraints.video
            : {}),
        };

        const audioConstraints = {
          ...DEFAULT_AUDIO_CONSTRAINTS,
          ...(selectedMic ? { deviceId: { exact: selectedMic } } : {}),
          ...(constraints?.audio && typeof constraints.audio === 'object'
            ? constraints.audio
            : {}),
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });

        setStream(mediaStream);
        setIsCapturing(true);
        setHasPermission(true);
        setVideoEnabled(true);
        setAudioEnabled(true);

        // Conectar al video element
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Iniciar monitoreo de audio
        startAudioMonitoring(mediaStream);

        // Actualizar lista de dispositivos
        await enumerateDevices();
      } catch (err) {
        console.error('Error starting capture:', err);
        setError(err instanceof Error ? err : new Error('Failed to start capture'));
        setHasPermission(false);
      }
    },
    [selectedCamera, selectedMic, enumerateDevices, startAudioMonitoring]
  );

  // Detener captura
  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    stopAudioMonitoring();
    setIsCapturing(false);
    setVideoEnabled(true);
    setAudioEnabled(true);
  }, [stream, stopAudioMonitoring]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, [stream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, [stream]);

  // Cambiar cámara
  const switchCamera = useCallback(
    async (deviceId: string) => {
      setSelectedCamera(deviceId);

      if (isCapturing) {
        // Detener video track actual
        const videoTrack = stream?.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
        }

        // Obtener nuevo video track
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...DEFAULT_VIDEO_CONSTRAINTS,
              deviceId: { exact: deviceId },
            },
          });

          const newVideoTrack = newStream.getVideoTracks()[0];

          if (stream) {
            // Reemplazar track en el stream existente
            const oldTrack = stream.getVideoTracks()[0];
            if (oldTrack) {
              stream.removeTrack(oldTrack);
            }
            stream.addTrack(newVideoTrack);

            // Actualizar video element
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          }
        } catch (err) {
          console.error('Error switching camera:', err);
          setError(err instanceof Error ? err : new Error('Failed to switch camera'));
        }
      }
    },
    [isCapturing, stream]
  );

  // Cambiar micrófono
  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      setSelectedMic(deviceId);

      if (isCapturing) {
        const audioTrack = stream?.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.stop();
        }

        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              ...DEFAULT_AUDIO_CONSTRAINTS,
              deviceId: { exact: deviceId },
            },
          });

          const newAudioTrack = newStream.getAudioTracks()[0];

          if (stream) {
            const oldTrack = stream.getAudioTracks()[0];
            if (oldTrack) {
              stream.removeTrack(oldTrack);
            }
            stream.addTrack(newAudioTrack);

            // Reiniciar monitoreo de audio
            stopAudioMonitoring();
            startAudioMonitoring(stream);
          }
        } catch (err) {
          console.error('Error switching microphone:', err);
          setError(err instanceof Error ? err : new Error('Failed to switch microphone'));
        }
      }
    },
    [isCapturing, stream, startAudioMonitoring, stopAudioMonitoring]
  );

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      stopAudioMonitoring();
    };
  }, [stream, stopAudioMonitoring]);

  // Enumerar dispositivos al inicio
  useEffect(() => {
    enumerateDevices();

    // Escuchar cambios de dispositivos
    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  return {
    stream,
    videoRef,
    isCapturing,
    hasPermission,
    videoEnabled,
    audioEnabled,
    audioLevel,
    error,
    cameras,
    microphones,
    selectedCamera,
    selectedMic,
    startCapture,
    stopCapture,
    toggleVideo,
    toggleAudio,
    switchCamera,
    switchMicrophone,
    requestPermissions,
  };
}
