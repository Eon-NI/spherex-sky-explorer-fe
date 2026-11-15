import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';

import {
  BUS_APOTHEM,
  BUS_HEIGHT,
  BUS_RADIUS,
  FACE,
  STOPS,
  WL_MAX,
  WL_MIN,
  ZOOM_TARGETS,
  type TourControls,
  type ZoomTarget,
} from './tourConfig';
import {
  drawRadar,
  drawSearch,
  drawSolarPanel,
  drawSpectral,
  drawTimelapse,
  type DrawFn,
} from './screens';

type SceneProps = {
  progressRef: RefObject<number>;
  controlsRef: RefObject<TourControls>;
  isMobile: boolean;
  reducedMotion: boolean;
  /** Pantalla hacia la que la cámara está haciendo zoom (null = ninguna) */
  zoomRef: RefObject<ZoomTarget | null>;
  /** Clic en una pantalla que abre una página (timelapse o spectral) */
  onOpenScreen: (target: ZoomTarget) => void;
};

/* =========================================================
   Textura de canvas animada para las pantallas
   ========================================================= */
/** Avisa a three.js de que el canvas cambió (fuera del componente para el linter de React) */
function markDirty(texture: THREE.Texture) {
  texture.needsUpdate = true;
}
function useScreenTexture(
  draw: DrawFn,
  controlsRef: RefObject<TourControls>,
  width = 512,
  height = 320,
) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }, [width, height]);

  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [canvas]);

  useEffect(() => () => texture.dispose(), [texture]);

  const acc = useRef(1);
  useFrame(({ clock }, delta) => {
    acc.current += delta;
    if (acc.current < 1 / 30) return; // ~30 fps es suficiente para un HUD
    acc.current = 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    draw(ctx, width, height, clock.elapsedTime, controlsRef.current);
    markDirty(texture);
  });

  return texture;
}

/* =========================================================
   Piezas del satélite
   ========================================================= */

/** Coloca a sus hijos sobre una cara del bus octogonal (z = hacia fuera) */
function FaceMount({ angle, children }: { angle: number; children: ReactNode }) {
  const d = BUS_APOTHEM + 0.005;
  return (
    <group position={[Math.sin(angle) * d, 0, Math.cos(angle) * d]} rotation={[0, angle, 0]}>
      {children}
    </group>
  );
}

function Screen({
  draw,
  controlsRef,
  size = [1, 0.6],
  position = [0, 0.2, 0],
  canActivate,
  onActivate,
}: {
  draw: DrawFn;
  controlsRef: RefObject<TourControls>;
  size?: [number, number];
  position?: [number, number, number];
  /** Si devuelve true, la pantalla responde al hover/clic */
  canActivate?: () => boolean;
  onActivate?: () => void;
}) {
  const texture = useScreenTexture(draw, controlsRef);
  const [w, h] = size;
  const [hovered, setHovered] = useState(false);
  const interactive = !!onActivate;

  useEffect(() => {
    if (!interactive) return;
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered, interactive]);

  return (
    <group position={position}>
      {/* halo al pasar el ratón */}
      {interactive && (
        <mesh position-z={0.001}>
          <planeGeometry args={[w + 0.2, h + 0.2]} />
          <meshBasicMaterial color="#ffb938" transparent opacity={hovered ? 0.45 : 0} toneMapped={false} />
        </mesh>
      )}
      {/* bisel */}
      <mesh position-z={0.02}>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.04]} />
        <meshStandardMaterial color="#0a0e18" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* pantalla */}
      <mesh
        position-z={0.045}
        onPointerOver={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          setHovered(canActivate ? canActivate() : true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          if (!interactive || (canActivate && !canActivate())) return;
          e.stopPropagation();
          setHovered(false);
          onActivate?.();
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* tira de luz cian */}
      <mesh position={[0, -h / 2 - 0.07, 0.03]}>
        <boxGeometry args={[w * 0.55, 0.012, 0.012]} />
        <meshBasicMaterial color="#ffb938" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Teclado decorativo bajo la pantalla de búsqueda */
function Keypad() {
  const keys = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        x: -0.4 + (i % 5) * 0.2,
        y: -0.37 - Math.floor(i / 5) * 0.14,
        lit: i === 1 || i === 3 || i === 7,
      })),
    [],
  );
  return (
    <group>
      {keys.map((k, i) => (
        <mesh key={i} position={[k.x, k.y, 0.025]}>
          <boxGeometry args={[0.15, 0.09, 0.04]} />
          <meshStandardMaterial
            color={k.lit ? '#ffb938' : '#1e2638'}
            emissive={k.lit ? '#ffb938' : '#000000'}
            emissiveIntensity={k.lit ? 1.2 : 0}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Slider + perillas tipo "volumen" que reflejan los µm seleccionados */
function SpectralControls({ controlsRef }: { controlsRef: RefObject<TourControls> }) {
  const handle = useRef<THREE.Mesh>(null);
  const knobs = useRef<(THREE.Group | null)[]>([]);
  const smooth = useRef(0.3);

  useFrame(({ clock }, delta) => {
    const n = (controlsRef.current.wavelength - WL_MIN) / (WL_MAX - WL_MIN);
    smooth.current = THREE.MathUtils.damp(smooth.current, n, 8, delta);
    if (handle.current) handle.current.position.x = -0.4 + smooth.current * 0.8;
    knobs.current.forEach((k, i) => {
      if (!k) return;
      const wobble = Math.sin(clock.elapsedTime * 0.8 + i) * 0.15;
      k.rotation.z = -(smooth.current * 4.2 - 2.1) * (i === 1 ? 1 : 0.5) + wobble;
    });
  });

  return (
    <group>
      {/* pista del slider */}
      <mesh position={[0, -0.27, 0.015]}>
        <boxGeometry args={[0.86, 0.025, 0.02]} />
        <meshBasicMaterial color="#5a4313" toneMapped={false} />
      </mesh>
      <mesh ref={handle} position={[0, -0.27, 0.04]}>
        <boxGeometry args={[0.05, 0.11, 0.05]} />
        <meshStandardMaterial color="#e2e8f0" emissive="#ffc95e" emissiveIntensity={0.6} metalness={0.6} roughness={0.25} />
      </mesh>

      {/* perillas */}
      {[-0.3, 0, 0.3].map((x, i) => (
        <group
          key={x}
          position={[x, -0.5, 0.04]}
          ref={(el) => {
            knobs.current[i] = el;
          }}
        >
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.075, 0.085, 0.07, 32]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.05, 0.037]}>
            <boxGeometry args={[0.012, 0.04, 0.005]} />
            <meshBasicMaterial color="#ffb938" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SolarPanel() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (ctx) drawSolarPanel(ctx, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group position={[0, -0.25, -BUS_APOTHEM]}>
      {/* brazo */}
      <mesh position-z={-0.45} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 12]} />
        <meshStandardMaterial color="#9ca3af" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -1.1]} rotation-x={0.3}>
        <boxGeometry args={[3.6, 1.7, 0.04]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.6}
          roughness={0.28}
          color="#ffffff"
        />
      </mesh>
    </group>
  );
}

const SHIELDS = [
  { top: 2.5, bottom: 1.0, h: 2.1 },
  { top: 2.2, bottom: 0.92, h: 1.9 },
  { top: 1.9, bottom: 0.84, h: 1.7 },
];

function Satellite({
  progressRef,
  controlsRef,
  reducedMotion,
  zoomRef,
  onOpenScreen,
}: Omit<SceneProps, 'isMobile'>) {
  // cada pantalla solo es clicable cuando el tour está parado en su módulo
  const canOpen = (target: ZoomTarget) => () =>
    !zoomRef.current &&
    Math.round(progressRef.current * (STOPS.length - 1)) === ZOOM_TARGETS[target].stop;

  const group = useRef<THREE.Group>(null);
  const radarTexture = useScreenTexture(drawRadar, controlsRef, 512, 512);

  useFrame(({ clock }, delta) => {
    if (controlsRef.current.playing) controlsRef.current.tlTime += delta;

    const g = group.current;
    if (!g) return;
    const p = progressRef.current * (STOPS.length - 1);
    // solo flota/rota en el hero; se queda quieto al recorrer el panel
    const idle = reducedMotion ? 0 : THREE.MathUtils.clamp(1 - p * 1.5, 0, 1);
    const t = clock.elapsedTime;
    g.rotation.y = Math.sin(t * 0.25) * 0.45 * idle;
    g.rotation.z = Math.sin(t * 0.3) * 0.04 * idle;
    g.position.y = Math.sin(t * 0.8) * 0.12 * idle;
  });

  return (
    <group ref={group}>
      {/* ---------- Bus octogonal ---------- */}
      <mesh rotation-y={Math.PI / 8}>
        <cylinderGeometry args={[BUS_RADIUS, BUS_RADIUS, BUS_HEIGHT, 8]} />
        <meshStandardMaterial color="#2a3347" metalness={0.65} roughness={0.4} flatShading />
      </mesh>
      {[BUS_HEIGHT / 2, -BUS_HEIGHT / 2].map((y) => (
        <mesh key={y} position-y={y} rotation-y={Math.PI / 8}>
          <cylinderGeometry args={[BUS_RADIUS * 1.02, BUS_RADIUS * 1.02, 0.06, 8]} />
          <meshStandardMaterial color="#c8a14a" metalness={1} roughness={0.3} flatShading />
        </mesh>
      ))}

      {/* ---------- Pantallas de los módulos ---------- */}
      <FaceMount angle={FACE.timelapse}>
        <Screen
          draw={drawTimelapse}
          controlsRef={controlsRef}
          size={[1, 0.62]}
          position={[0, 0.15, 0]}
          canActivate={canOpen('timelapse')}
          onActivate={() => onOpenScreen('timelapse')}
        />
      </FaceMount>

      <FaceMount angle={FACE.search}>
        <Screen
          draw={drawSearch}
          controlsRef={controlsRef}
          size={[1, 0.5]}
          position={[0, 0.3, 0]}
          canActivate={canOpen('search')}
          onActivate={() => onOpenScreen('search')}
        />
        <Keypad />
      </FaceMount>

      <FaceMount angle={FACE.spectral}>
        <Screen
          draw={drawSpectral}
          controlsRef={controlsRef}
          size={[1, 0.5]}
          position={[0, 0.3, 0]}
          canActivate={canOpen('spectral')}
          onActivate={() => onOpenScreen('spectral')}
        />
        <SpectralControls controlsRef={controlsRef} />
      </FaceMount>

      {/* ---------- Escudos cónicos + telescopio ---------- */}
      {SHIELDS.map((s, i) => (
        <mesh key={i} position-y={BUS_HEIGHT / 2 + 0.05 + s.h / 2}>
          <cylinderGeometry args={[s.top, s.bottom, s.h, 64, 1, true]} />
          <meshStandardMaterial
            color="#cbd5e1"
            metalness={0.9}
            roughness={0.26 + i * 0.06}
            envMapIntensity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <mesh position-y={BUS_HEIGHT / 2 + 0.55}>
        <cylinderGeometry args={[0.6, 0.6, 1.1, 32]} />
        <meshStandardMaterial color="#0b0f19" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* compuerta / radar del módulo sorpresa */}
      <mesh position-y={BUS_HEIGHT / 2 + 1.11} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.56, 64]} />
        <meshBasicMaterial map={radarTexture} toneMapped={false} />
      </mesh>
      <mesh position-y={BUS_HEIGHT / 2 + 1.11} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.6, 0.018, 12, 64]} />
        <meshBasicMaterial color="#ffb938" toneMapped={false} />
      </mesh>

      {/* ---------- Panel solar y propulsores ---------- */}
      <SolarPanel />
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.9, -BUS_HEIGHT / 2 - 0.12, Math.cos(a) * 0.9]}
            rotation-x={Math.PI}
          >
            <coneGeometry args={[0.1, 0.22, 16, 1, true]} />
            <meshStandardMaterial color="#c8a14a" metalness={1} roughness={0.35} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

/* =========================================================
   Cámara: interpola entre paradas según el scroll
   ========================================================= */
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Interpola en coordenadas cilíndricas para que la cámara orbite (no atraviese el satélite) */
function cylLerp(a: THREE.Vector3, b: THREE.Vector3, f: number, out: THREE.Vector3) {
  const aAng = Math.atan2(a.x, a.z);
  const bAng = Math.atan2(b.x, b.z);
  let d = bAng - aAng;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  const ang = aAng + d * f;
  const r = THREE.MathUtils.lerp(Math.hypot(a.x, a.z), Math.hypot(b.x, b.z), f);
  out.set(Math.sin(ang) * r, THREE.MathUtils.lerp(a.y, b.y, f), Math.cos(ang) * r);
  return out;
}

function CameraRig({
  progressRef,
  isMobile,
  reducedMotion,
  zoomRef,
}: Omit<SceneProps, 'controlsRef' | 'onOpenScreen'>) {
  const camera = useThree((s) => s.camera);
  const pointer = useThree((s) => s.pointer);
  const aspect = useThree((s) => s.size.width / s.size.height);

  const goalPosRef = useRef(new THREE.Vector3());
  const goalTargetRef = useRef(new THREE.Vector3());
  const posRef = useRef(STOPS[0].position.clone());
  const targetRef = useRef(STOPS[0].target.clone());
  const shift = useRef({ x: STOPS[0].shiftX, y: STOPS[0].shiftY });

  useFrame((_, delta) => {
    const goalPos = goalPosRef.current;
    const goalTarget = goalTargetRef.current;
    const pos = posRef.current;
    const target = targetRef.current;
    const last = STOPS.length - 1;
    const p = THREE.MathUtils.clamp(progressRef.current, 0, 1) * last;
    const i = Math.min(Math.floor(p), last - 1);
    const f = ease(p - i);
    const a = STOPS[i];
    const b = STOPS[i + 1];

    cylLerp(a.position, b.position, f, goalPos);
    goalTarget.lerpVectors(a.target, b.target, f);

    // pequeño arco hacia fuera a mitad de cada transición (más cinemático)
    const arc = Math.sin(f * Math.PI);
    goalPos.y += arc * 0.5;
    goalPos.multiplyScalar(1 + arc * 0.12);

    const zoomTarget = zoomRef.current;
    const zooming = zoomTarget !== null;

    // en pantallas verticales el campo horizontal es estrecho: alejamos la cámara
    const zoomOut = !zooming && aspect < 1 ? THREE.MathUtils.clamp(1.1 / aspect, 1, 2.2) : 1;
    if (zoomOut > 1) goalPos.sub(goalTarget).multiplyScalar(zoomOut).add(goalTarget);

    if (zoomTarget) {
      // "entra" en la pantalla elegida
      goalPos.copy(ZOOM_TARGETS[zoomTarget].camera);
      goalTarget.copy(ZOOM_TARGETS[zoomTarget].center);
    } else if (!reducedMotion) {
      goalPos.x += pointer.x * 0.12;
      goalPos.y += pointer.y * 0.08;
    }

    const k = 1 - Math.exp((zooming ? -3 : -4) * delta); // suavizado independiente de los FPS
    pos.lerp(goalPos, k);
    target.lerp(goalTarget, k);
    const goalShiftX = zooming ? 0 : THREE.MathUtils.lerp(a.shiftX, b.shiftX, f);
    const goalShiftY = zooming ? 0 : THREE.MathUtils.lerp(a.shiftY, b.shiftY, f);
    shift.current.x = THREE.MathUtils.lerp(shift.current.x, goalShiftX, k);
    shift.current.y = THREE.MathUtils.lerp(shift.current.y, goalShiftY, k);

    camera.position.copy(pos);
    camera.lookAt(target);
    // deja hueco para la tarjeta HTML
    if (isMobile) camera.translateY(shift.current.y * zoomOut);
    else camera.translateX(shift.current.x);
  });

  return null;
}

/* =========================================================
   Escena
   ========================================================= */
export default function SatelliteScene({
  progressRef,
  controlsRef,
  isMobile,
  reducedMotion,
  zoomRef,
  onOpenScreen,
}: SceneProps) {
  return (
    <>
      {/* sin color de fondo: se ve el degradado .bg-nasa del landing detrás del canvas */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 6, 5]} intensity={2.4} color="#fff4e0" />
      <directionalLight position={[-6, -2, -4]} intensity={0.9} color="#38bdf8" />
      <pointLight position={[-4, -3, 3]} intensity={6} distance={12} color="#7c3aed" />

      {/* Reflejos para el metal (sin descargar HDRs) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, -6]} scale={[10, 3, 1]} />
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#7dd3fc"
          position={[-6, 1, 2]}
          rotation-y={Math.PI / 2}
          scale={[6, 2, 1]}
        />
        <Lightformer form="ring" intensity={2} position={[5, 3, 4]} scale={2} />
        <Lightformer form="rect" intensity={1.5} position={[6, 2, 10]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#a78bfa" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>

      <Stars radius={80} depth={40} count={4000} factor={3} saturation={0} fade speed={0.4} />
      <Sparkles count={60} scale={[14, 8, 14]} size={1.6} speed={0.2} color="#7dd3fc" opacity={0.5} />

      <Satellite
        progressRef={progressRef}
        controlsRef={controlsRef}
        reducedMotion={reducedMotion}
        zoomRef={zoomRef}
        onOpenScreen={onOpenScreen}
      />
      <CameraRig
        progressRef={progressRef}
        isMobile={isMobile}
        reducedMotion={reducedMotion}
        zoomRef={zoomRef}
      />
    </>
  );
}
