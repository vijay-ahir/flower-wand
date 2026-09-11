import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const FLOWER_EMOJIS = ['🌸', '🌼', '🌻', '🌺', '🌷', '💐'];

// One flower particle: where it lives, how it moves, how long it's lived.
function makeFlower(x, y, vx = 0, vy = 0) {
  return {
    x,
    y,
    vx,
    vy,
    emoji: FLOWER_EMOJIS[Math.floor(Math.random() * FLOWER_EMOJIS.length)],
    size: 24 + Math.random() * 20,
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 4,
    born: performance.now(),
    life: 2200 + Math.random() * 1200, // ms before it fades out
  };
}

// Distance between two landmark points.
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Is this hand "pointing" (index finger extended, others curled)?
function isPointing(landmarks) {
  const wrist = landmarks[0];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexExtended = dist(indexTip, wrist) > dist(indexPip, wrist) * 1.3;
  const othersCurled =
    dist(middleTip, wrist) < dist(indexTip, wrist) * 0.85 &&
    dist(ringTip, wrist) < dist(indexTip, wrist) * 0.85 &&
    dist(pinkyTip, wrist) < dist(indexTip, wrist) * 0.85;

  return indexExtended && othersCurled;
}

// Is this hand "open" (all fingertips far from the palm center)?
function isOpenPalm(landmarks) {
  const wrist = landmarks[0];
  const tips = [4, 8, 12, 16, 20].map((i) => landmarks[i]);
  const avgDist = tips.reduce((sum, t) => sum + dist(t, wrist), 0) / tips.length;
  return avgDist > 0.28; // normalized coords (0-1), tune this threshold to taste
}

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const flowersRef = useRef([]);
  const landmarkerRef = useRef(null);
  const lastPlantRef = useRef(0);
  const lastScatterRef = useRef(0);

  const [status, setStatus] = useState('Loading hand tracking model…');

  useEffect(() => {
    let stream;
    let rafId;

    async function setup() {
      // 1. Load MediaPipe's hand landmark model (runs fully in-browser).
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      // 2. Turn on the webcam.
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setStatus('Point to plant · Open your hand to scatter');
      loop();
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      // Mirror the video so movement feels natural (like a mirror/selfie cam).
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      const result = landmarkerRef.current.detectForVideo(video, performance.now());
      const now = performance.now();

      if (result.landmarks) {
        for (const landmarks of result.landmarks) {
          const tip = landmarks[8]; // index fingertip, normalized 0-1
          const px = (1 - tip.x) * canvas.width; // un-mirror the x coord
          const py = tip.y * canvas.height;

          if (isPointing(landmarks) && now - lastPlantRef.current > 120) {
            flowersRef.current.push(makeFlower(px, py, (Math.random() - 0.5) * 0.4, -0.3 - Math.random() * 0.3));
            lastPlantRef.current = now;
          } else if (isOpenPalm(landmarks) && now - lastScatterRef.current > 400) {
            // Scatter: give nearby flowers an outward burst of velocity.
            for (const f of flowersRef.current) {
              const d = Math.hypot(f.x - px, f.y - py);
              if (d < 220) {
                const angle = Math.atan2(f.y - py, f.x - px);
                f.vx += Math.cos(angle) * 3;
                f.vy += Math.sin(angle) * 3 - 1;
              }
            }
            lastScatterRef.current = now;
          }
        }
      }

      // Update & draw flowers.
      flowersRef.current = flowersRef.current.filter((f) => now - f.born < f.life);
      for (const f of flowersRef.current) {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.02; // gentle gravity
        f.rotation += f.spin;

        const age = (now - f.born) / f.life;
        const opacity = age < 0.8 ? 1 : 1 - (age - 0.8) / 0.2;

        ctx.save();
        ctx.globalAlpha = Math.max(opacity, 0);
        ctx.translate(f.x, f.y);
        ctx.rotate((f.rotation * Math.PI) / 180);
        ctx.font = `${f.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.emoji, 0, 0);
        ctx.restore();
      }

      rafId = requestAnimationFrame(loop);
    }

    setup().catch((err) => setStatus('Error: ' + err.message));

    return () => {
      cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 20,
          fontFamily: 'sans-serif',
          fontSize: 14,
        }}
      >
        {status}
      </div>
    </div>
  );
}
