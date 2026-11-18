import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Layers, Sparkles, ShieldCheck, ScanLine, RotateCcw } from 'lucide-react';
import { StaticShieldSvg } from './StaticShieldSvg';
import {
  createInitialShieldLifecycleState,
  transitionShieldLifecycle,
  computeAdaptiveParticleCount,
  type ShieldLifecycleState,
  type ShieldLifecycleEvent,
} from '../engine/shieldRenderStateMachine';

export type Shield3DVisualMode = 'idle' | 'scanning' | 'protected' | 'neutralizing';

declare global {
  interface Window {
    __OPENSHIELD_DISABLE_WEBGL__?: boolean;
  }
}

interface OpenShield3DSceneProps {
  mode: Shield3DVisualMode;
  installedInBrowser: boolean;
  findingsCount: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  lang: 'en' | 'hi';
  onTriggerScan?: () => void;
  onActivateBrowserShield?: () => void;
}

function createShieldShape(scale = 1): THREE.Shape {
  const s = scale;
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.35 * s);
  shape.quadraticCurveTo(0.95 * s, 1.32 * s, 1.12 * s, 0.85 * s);
  shape.bezierCurveTo(1.15 * s, 0.05 * s, 0.78 * s, -0.78 * s, 0, -1.38 * s);
  shape.bezierCurveTo(-0.78 * s, -0.78 * s, -1.15 * s, 0.05 * s, -1.12 * s, 0.85 * s);
  shape.quadraticCurveTo(-0.95 * s, 1.32 * s, 0, 1.35 * s);
  return shape;
}

function createRadialShadowTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  const maxRadius = center;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxRadius;
      const idx = (y * size + x) * 4;
      const falloff = Math.max(0, 1 - dist);
      const alpha = Math.round(Math.pow(falloff, 2.2) * 184);
      data[idx] = 2;
      data[idx + 1] = 6;
      data[idx + 2] = 23;
      data[idx + 3] = alpha;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export const OpenShield3DScene: React.FC<OpenShield3DSceneProps> = ({
  mode,
  installedInBrowser,
  lang,
  onActivateBrowserShield,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [exploded, setExploded] = useState<boolean>(false);
  const [localScanBoost, setLocalScanBoost] = useState<boolean>(false);
  const [hoveredLayer, setHoveredLayer] = useState<string>('AI Risk Engine Ready');

  const [lifecycle, setLifecycle] = useState<ShieldLifecycleState>(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const params =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const forceSvgOnly = params?.get('stage') === 'svg-only';
    return createInitialShieldLifecycleState({
      reducedMotion: isReduced,
      forceStaticSvg: forceSvgOnly,
    });
  });

  const dispatchLifecycle = (event: ShieldLifecycleEvent) => {
    setLifecycle((prev) => transitionShieldLifecycle(prev, event));
  };

  const stateRef = useRef({
    mode,
    installedInBrowser,
    exploded,
    localScanBoost,
    pointerX: 0,
    pointerY: 0,
    reducedMotion: lifecycle.reducedMotion,
    isOffscreenOrHidden: false,
  });

  useEffect(() => {
    stateRef.current.mode = mode;
    stateRef.current.installedInBrowser = installedInBrowser;
    stateRef.current.exploded = exploded;
    stateRef.current.localScanBoost = localScanBoost;
  }, [mode, installedInBrowser, exploded, localScanBoost]);

  // Listen to prefers-reduced-motion changes dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      stateRef.current.reducedMotion = e.matches;
      dispatchLifecycle({ type: 'SET_REDUCED_MOTION', reducedMotion: e.matches });
    };
    mql.addEventListener?.('change', onChange);
    return () => {
      mql.removeEventListener?.('change', onChange);
    };
  }, []);

  // Asynchronous background 3D initialization after initial Static SVG paint
  useEffect(() => {
    const container = mountRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('stage') === 'svg-only') {
      dispatchLifecycle({ type: 'FORCE_STATIC_SVG' });
      return;
    }

    if (params.get('webgl') === 'off' || window.__OPENSHIELD_DISABLE_WEBGL__ === true) {
      dispatchLifecycle({ type: 'WEBGL_UNAVAILABLE' });
      return;
    }

    let disposed = false;
    let rafId = 0;
    let initTimerId = 0;
    let timeoutGuardId = 0;
    let cleanupScene: (() => void) | null = null;

    dispatchLifecycle({ type: 'START_3D_INIT' });

    // Timeout guard so static SVG stays visible if WebGL hangs
    timeoutGuardId = window.setTimeout(() => {
      if (!disposed) {
        dispatchLifecycle({ type: 'INIT_TIMEOUT' });
      }
    }, 4500);

    // Defer heavy WebGL creation to next frame so the static SVG renders first with zero main-thread block
    initTimerId = window.setTimeout(() => {
      if (disposed) return;

      const width = Math.max(container.clientWidth, 280);
      const height = Math.max(container.clientHeight, 260);
      const isMobileViewport = window.innerWidth < 768;

      const isHeadlessOrAutomated =
        typeof navigator !== 'undefined' && navigator.webdriver === true;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isMobileViewport && !isHeadlessOrAutomated,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        });
      } catch {
        window.clearTimeout(timeoutGuardId);
        dispatchLifecycle({ type: 'WEBGL_UNAVAILABLE' });
        return;
      }

      const gl = renderer.getContext();
      if (!gl) {
        window.clearTimeout(timeoutGuardId);
        renderer.dispose();
        dispatchLifecycle({ type: 'WEBGL_UNAVAILABLE' });
        return;
      }

      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      const isSoftwareGl =
        isHeadlessOrAutomated || /swiftshader|llvmpipe|softpipe|software/i.test(rendererName);

      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, isMobileViewport ? 1.5 : 2)
      );
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Handle WebGL context loss gracefully -> revert to Static SVG
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        disposed = true;
        cancelAnimationFrame(rafId);
        dispatchLifecycle({ type: 'CONTEXT_LOST' });
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 0.2, 5.35);

      let envTex: THREE.Texture | null = null;
      if (!isSoftwareGl) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTex;
        pmrem.dispose();
      }

      // Studio 3-point lighting with cyan-blue & violet cybersecurity accents
      const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x050814, 0.85);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xf8fafc, 2.5);
      keyLight.position.set(4, 6, 5);
      scene.add(keyLight);

      const cyanRimLight = new THREE.DirectionalLight(0x38bdf8, 1.9);
      cyanRimLight.position.set(-4.5, 2.5, -3.5);
      scene.add(cyanRimLight);

      const violetRimLight = new THREE.DirectionalLight(0x8b5cf6, 1.45);
      violetRimLight.position.set(4.2, -2.2, -3.0);
      scene.add(violetRimLight);

      const corePointLight = new THREE.PointLight(0x38bdf8, 2.6, 8);
      corePointLight.position.set(0, 0.1, 1.4);
      scene.add(corePointLight);

      // Root 3D Group for the OpenShield Hero Shield
      const rootGroup = new THREE.Group();
      scene.add(rootGroup);

      // 1. Outer Beveled Midnight-Navy Metallic Shield Body
      const outerShape = createShieldShape(1.0);
      const outerGeo = new THREE.ExtrudeGeometry(outerShape, {
        depth: 0.24,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.07,
        bevelThickness: 0.08,
      });
      outerGeo.center();

      const armorMat = new THREE.MeshPhysicalMaterial({
        color: 0x0b132b,
        metalness: 0.82,
        roughness: 0.2,
        clearcoat: 0.92,
        clearcoatRoughness: 0.12,
      });
      const armorMesh = new THREE.Mesh(outerGeo, armorMat);
      rootGroup.add(armorMesh);

      // 2. Brushed Cyan-Titanium Inner Frame Trim
      const rimOuter = createShieldShape(0.86);
      const rimHole = createShieldShape(0.68);
      rimOuter.holes.push(rimHole);
      const rimGeo = new THREE.ExtrudeGeometry(rimOuter, {
        depth: 0.14,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.03,
        bevelThickness: 0.04,
      });
      rimGeo.center();

      const titaniumMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        emissive: 0x0284c7,
        emissiveIntensity: 0.22,
        metalness: 0.9,
        roughness: 0.18,
      });
      const rimMesh = new THREE.Mesh(rimGeo, titaniumMat);
      rimMesh.position.z = 0.18;
      rootGroup.add(rimMesh);

      // 3. Forensic Dark-Glass Circuit Backplate
      const plateShape = createShieldShape(0.7);
      const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02,
      });
      plateGeo.center();
      const plateMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        metalness: 0.55,
        roughness: 0.28,
        clearcoat: 0.6,
      });
      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateMesh.position.z = 0.14;
      rootGroup.add(plateMesh);

      // 4. Subtle AI Circuit Trace Lines on the Shield Face
      const circuitGroup = new THREE.Group();
      circuitGroup.position.z = 0.22;
      rootGroup.add(circuitGroup);

      const traceMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.8,
      });
      const traceGeoV = new THREE.BoxGeometry(0.028, 0.55, 0.02);
      const topTrace = new THREE.Mesh(traceGeoV, traceMat);
      topTrace.position.set(0, 0.52, 0);
      circuitGroup.add(topTrace);

      const bottomTrace = new THREE.Mesh(traceGeoV, traceMat);
      bottomTrace.position.set(0, -0.52, 0);
      circuitGroup.add(bottomTrace);

      // 5. Central Glowing AI Core (Cyan-Blue Crystal + Violet Neural Cage)
      const crystalGroup = new THREE.Group();
      crystalGroup.position.z = 0.35;
      rootGroup.add(crystalGroup);

      const crystalGeo = new THREE.OctahedronGeometry(0.42, 1);
      const crystalMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        metalness: 0.2,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
      });
      const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
      crystalGroup.add(crystalMesh);

      const wireGeo = new THREE.IcosahedronGeometry(0.51, 1);
      const wireMat = new THREE.MeshStandardMaterial({
        color: 0xa78bfa,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.5,
        wireframe: true,
        transparent: true,
        opacity: 0.62,
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      crystalGroup.add(wireMesh);

      // 6. Dual Gyroscopic Holographic Rings (Cyan & Violet)
      const outerRingGeo = new THREE.TorusGeometry(1.52, 0.02, 16, 84);
      const outerRingMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
        metalness: 0.85,
        roughness: 0.15,
      });
      const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
      outerRingMesh.rotation.x = Math.PI * 0.32;
      outerRingMesh.rotation.y = Math.PI * 0.12;
      rootGroup.add(outerRingMesh);

      const innerRingGeo = new THREE.TorusGeometry(1.26, 0.016, 16, 72);
      const innerRingMat = new THREE.MeshStandardMaterial({
        color: 0xa78bfa,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.65,
        metalness: 0.8,
        roughness: 0.2,
      });
      const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRingMesh.rotation.x = -Math.PI * 0.28;
      innerRingMesh.rotation.y = -Math.PI * 0.18;
      rootGroup.add(innerRingMesh);

      // 7. Holographic Laser Scan Plane
      const laserBarGeo = new THREE.BoxGeometry(2.15, 0.032, 0.06);
      const laserBarMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.82,
      });
      const laserBarMesh = new THREE.Mesh(laserBarGeo, laserBarMat);
      laserBarMesh.position.z = 0.52;
      rootGroup.add(laserBarMesh);

      // 8. Four Floating Clause Satellite Nodes
      const satellites: Array<{
        group: THREE.Group;
        basePos: THREE.Vector3;
        explodedPos: THREE.Vector3;
        phase: number;
      }> = [];

      const satConfigs = [
        {
          base: new THREE.Vector3(-1.35, 0.92, 0.25),
          exploded: new THREE.Vector3(-1.8, 1.12, 0.62),
          color: 0x38bdf8,
          phase: 0,
        },
        {
          base: new THREE.Vector3(1.35, 0.92, 0.25),
          exploded: new THREE.Vector3(1.8, 1.12, 0.62),
          color: 0x8b5cf6,
          phase: 1.5,
        },
        {
          base: new THREE.Vector3(-1.28, -0.82, 0.25),
          exploded: new THREE.Vector3(-1.7, -1.02, 0.62),
          color: 0x10b981,
          phase: 3.1,
        },
        {
          base: new THREE.Vector3(1.28, -0.82, 0.25),
          exploded: new THREE.Vector3(1.7, -1.02, 0.62),
          color: 0x38bdf8,
          phase: 4.6,
        },
      ];

      const satCardGeo = new THREE.BoxGeometry(0.42, 0.26, 0.06);
      const satPinGeo = new THREE.SphereGeometry(0.052, 12, 12);

      satConfigs.forEach((cfg) => {
        const satGroup = new THREE.Group();
        satGroup.position.copy(cfg.base);

        const cardMat = new THREE.MeshPhysicalMaterial({
          color: 0x0f172a,
          metalness: 0.72,
          roughness: 0.24,
          clearcoat: 0.8,
        });
        const card = new THREE.Mesh(satCardGeo, cardMat);
        satGroup.add(card);

        const pinMat = new THREE.MeshStandardMaterial({
          color: cfg.color,
          emissive: cfg.color,
          emissiveIntensity: 0.85,
        });
        const pin = new THREE.Mesh(satPinGeo, pinMat);
        pin.position.set(-0.11, 0.03, 0.045);
        satGroup.add(pin);

        rootGroup.add(satGroup);
        satellites.push({
          group: satGroup,
          basePos: cfg.base,
          explodedPos: cfg.exploded,
          phase: cfg.phase,
        });
      });

      // 9. Adaptive Floating Cybersecurity Particles (InstancedMesh)
      const particleCount = computeAdaptiveParticleCount({
        isMobileViewport,
        isSoftwareGl,
        reducedMotion: stateRef.current.reducedMotion,
      });
      const particleGeo = new THREE.OctahedronGeometry(0.038, 0);
      const particleMat = new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.75,
      });
      const particleInstanced = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
      const dummyObj = new THREE.Object3D();
      const particleColor = new THREE.Color();
      const particleSeeds = Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 1.62 + (i % 3) * 0.28;
        const y = ((i % 7) - 3) * 0.36;
        const z = ((i % 4) - 1.5) * 0.22;
        dummyObj.position.set(Math.cos(angle) * radius, y, z);
        dummyObj.updateMatrix();
        particleInstanced.setMatrixAt(i, dummyObj.matrix);
        particleColor.setHex(i % 2 === 0 ? 0x38bdf8 : 0xa78bfa);
        particleInstanced.setColorAt(i, particleColor);
        return { angle, radius, y, z, speed: 0.35 + (i % 4) * 0.1 };
      });
      particleInstanced.instanceMatrix.needsUpdate = true;
      if (particleInstanced.instanceColor) particleInstanced.instanceColor.needsUpdate = true;
      rootGroup.add(particleInstanced);

      // 10. Soft Radial Ground Contact Shadow
      const shadowTex = createRadialShadowTexture();
      const shadowGeo = new THREE.PlaneGeometry(3.8, 3.8);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -1.72;
      scene.add(shadowMesh);

      // Render FIRST frame synchronously before triggering the SVG -> 3D crossfade!
      renderer.render(scene, camera);
      window.clearTimeout(timeoutGuardId);
      dispatchLifecycle({ type: 'FIRST_FRAME_RENDERED' });

      // Pointer Parallax Interaction
      const handlePointerMove = (e: MouseEvent) => {
        if (stateRef.current.reducedMotion) return;
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        stateRef.current.pointerX = Math.max(-1, Math.min(1, nx));
        stateRef.current.pointerY = Math.max(-1, Math.min(1, ny));
      };

      const handlePointerLeave = () => {
        stateRef.current.pointerX = 0;
        stateRef.current.pointerY = 0;
      };

      container.addEventListener('mousemove', handlePointerMove);
      container.addEventListener('mouseleave', handlePointerLeave);

      // ResizeObserver
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.max(entry.contentRect.width, 260);
          const h = Math.max(entry.contentRect.height, 250);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          renderer.render(scene, camera);
        }
      });
      ro.observe(container);

      // IntersectionObserver & visibilitychange to pause off-screen rendering
      const io = new IntersectionObserver(
        (entries) => {
          const isIntersecting = entries.some((entry) => entry.isIntersecting);
          stateRef.current.isOffscreenOrHidden = !isIntersecting || document.hidden;
          dispatchLifecycle({
            type: 'SET_VISIBILITY',
            isOffscreenOrHidden: stateRef.current.isOffscreenOrHidden,
          });
        },
        { threshold: 0.05 }
      );
      io.observe(wrapper);

      const handleVisibilityChange = () => {
        stateRef.current.isOffscreenOrHidden = document.hidden;
        dispatchLifecycle({
          type: 'SET_VISIBILITY',
          isOffscreenOrHidden: stateRef.current.isOffscreenOrHidden,
        });
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      const afterDraw = (cb: () => void) => {
        if (!isSoftwareGl) {
          rafId = requestAnimationFrame(cb);
          return;
        }
        window.setTimeout(() => {
          if (!disposed) cb();
        }, 32);
      };

      const startTime = performance.now();
      const targetColorObj = new THREE.Color();
      let lastSoftwareProtected = stateRef.current.installedInBrowser || stateRef.current.mode === 'protected';
      let lastSoftwareScanning =
        stateRef.current.mode === 'scanning' ||
        stateRef.current.mode === 'neutralizing' ||
        stateRef.current.localScanBoost;

      const tick = () => {
        if (disposed) return;
        const st = stateRef.current;

        // If off-screen or hidden, pause rendering work and poll lightly
        if (st.isOffscreenOrHidden) {
          setTimeout(tick, 250);
          return;
        }

        const elapsed = (performance.now() - startTime) * 0.001;
        const isScanningActive =
          st.mode === 'scanning' || st.mode === 'neutralizing' || st.localScanBoost;
        const isProtectedActive = st.installedInBrowser || st.mode === 'protected';

        // Controlled cyan-blue default glow, emerald when browser shield armed
        const targetColorHex = isScanningActive
          ? 0x00f0ff
          : isProtectedActive
          ? 0x10b981
          : 0x38bdf8;

        targetColorObj.setHex(targetColorHex);
        crystalMat.color.lerp(targetColorObj, 0.08);
        crystalMat.emissive.lerp(targetColorObj, 0.08);
        corePointLight.color.lerp(targetColorObj, 0.08);
        laserBarMat.color.lerp(targetColorObj, 0.1);

        // Exploded view interpolation (always responsive to user click)
        const targetArmorZ = st.exploded ? -0.36 : 0;
        const targetPlateZ = st.exploded ? 0.12 : 0.14;
        const targetRimZ = st.exploded ? 0.44 : 0.18;
        const targetCrystalZ = st.exploded ? 0.85 : 0.35;

        const isInterpolatingLayers =
          Math.abs(targetArmorZ - armorMesh.position.z) > 0.003 ||
          Math.abs(targetCrystalZ - crystalGroup.position.z) > 0.003;

        armorMesh.position.z += (targetArmorZ - armorMesh.position.z) * 0.12;
        plateMesh.position.z += (targetPlateZ - plateMesh.position.z) * 0.12;
        rimMesh.position.z += (targetRimZ - rimMesh.position.z) * 0.12;
        crystalGroup.position.z += (targetCrystalZ - crystalGroup.position.z) * 0.12;

        if (!st.reducedMotion) {
          // Gentle floating motion + subtle pointer parallax
          rootGroup.position.y = Math.sin(elapsed * 1.55) * 0.075;
          const targetRotY = st.pointerX * 0.38 + Math.sin(elapsed * 0.6) * 0.15;
          const targetRotX = -st.pointerY * 0.24 + Math.cos(elapsed * 0.45) * 0.05;
          rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.08;
          rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.08;

          // AI Crystal rotation
          const spinSpeed = isScanningActive ? 2.2 : 0.75;
          crystalMesh.rotation.y += 0.014 * spinSpeed;
          crystalMesh.rotation.x += 0.008 * spinSpeed;
          wireMesh.rotation.y -= 0.011 * spinSpeed;

          // Gyroscopic rings
          outerRingMesh.rotation.z += isScanningActive ? 0.024 : 0.007;
          innerRingMesh.rotation.z -= isScanningActive ? 0.028 : 0.009;

          // Holographic scanner bar
          const sweepSpeed = isScanningActive ? 3.4 : 1.2;
          laserBarMesh.position.y = Math.sin(elapsed * sweepSpeed) * 1.02;
          laserBarMat.opacity = isScanningActive ? 0.9 : 0.45;

          // Floating particles
          for (let i = 0; i < particleCount; i++) {
            const p = particleSeeds[i];
            const a = p.angle + elapsed * p.speed;
            dummyObj.position.set(
              Math.cos(a) * p.radius,
              p.y + Math.sin(elapsed * 1.4 + i) * 0.08,
              p.z
            );
            dummyObj.rotation.set(elapsed * 0.5, elapsed * 0.3, 0);
            dummyObj.updateMatrix();
            particleInstanced.setMatrixAt(i, dummyObj.matrix);
          }
          particleInstanced.instanceMatrix.needsUpdate = true;

          // Satellite nodes
          satellites.forEach((sat) => {
            const dest = st.exploded ? sat.explodedPos : sat.basePos;
            sat.group.position.lerp(dest, 0.09);
            sat.group.position.y += Math.sin(elapsed * 1.9 + sat.phase) * 0.0025;
            sat.group.rotation.y = Math.sin(elapsed * 1.0 + sat.phase) * 0.18;
          });
        } else {
          // Reduced motion: keep shield calm and centered
          rootGroup.position.y = 0;
          rootGroup.rotation.set(0, 0, 0);
          laserBarMesh.position.y = 0;
          laserBarMat.opacity = 0.35;
          satellites.forEach((sat) => {
            const dest = st.exploded ? sat.explodedPos : sat.basePos;
            sat.group.position.copy(dest);
            sat.group.rotation.set(0, 0, 0);
          });
        }

        const softwareNeedsRender =
          isInterpolatingLayers ||
          st.pointerX !== 0 ||
          st.pointerY !== 0 ||
          isScanningActive !== lastSoftwareScanning ||
          isProtectedActive !== lastSoftwareProtected;

        if (!isSoftwareGl || softwareNeedsRender) {
          renderer.render(scene, camera);
          lastSoftwareScanning = isScanningActive;
          lastSoftwareProtected = isProtectedActive;
        }

        if (st.reducedMotion) {
          setTimeout(tick, 250);
        } else {
          afterDraw(tick);
        }
      };

      rafId = requestAnimationFrame(tick);

      cleanupScene = () => {
        ro.disconnect();
        io.disconnect();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        container.removeEventListener('mousemove', handlePointerMove);
        container.removeEventListener('mouseleave', handlePointerLeave);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material?.dispose();
            }
          }
        });
        envTex?.dispose();
        shadowTex.dispose();
        renderer.dispose();
      };
    }, 30);

    return () => {
      disposed = true;
      window.clearTimeout(initTimerId);
      window.clearTimeout(timeoutGuardId);
      cancelAnimationFrame(rafId);
      cleanupScene?.();
    };
  }, []);

  const triggerPulseScan = () => {
    setLocalScanBoost(true);
    setHoveredLayer('Active Holographic Clause Sweep');
    setTimeout(() => {
      setLocalScanBoost(false);
      setHoveredLayer('AI Risk Engine Ready');
    }, 1800);
  };

  const isScanningNow = mode === 'scanning' || mode === 'neutralizing' || localScanBoost;

  return (
    <div
      ref={wrapperRef}
      data-testid="openshield-3d-showcase"
      data-shield-stage={lifecycle.stage}
      data-first-frame-rendered={lifecycle.firstFrameRendered ? 'true' : 'false'}
      data-reduced-motion={lifecycle.reducedMotion ? 'true' : 'false'}
      data-fallback-reason={lifecycle.fallbackReason}
      className="relative w-full rounded-2xl bg-gradient-to-br from-[#050814] via-[#0B132B] to-[#111827] border border-cyan-500/25 overflow-hidden shadow-[0_25px_60px_-15px_rgba(2,132,199,0.28)] flex flex-col justify-between min-h-[380px] sm:min-h-[410px]"
    >
      {/* Top Status & Control Bar */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-4 pt-3.5">
        <div
          data-testid="shield-status-pill"
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#090D1A]/90 border border-cyan-400/30 text-[11px] font-bold text-cyan-300 whitespace-nowrap shrink-0"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              installedInBrowser ? 'bg-emerald-400' : 'bg-cyan-400'
            } ${!lifecycle.reducedMotion ? 'animate-pulse' : ''}`}
          />
          <span>
            {isScanningNow
              ? lang === 'hi'
                ? 'शर्तों का विश्लेषण जारी...'
                : 'Scanning Clauses & Hidden Risks...'
              : installedInBrowser
              ? lang === 'hi'
                ? 'ब्राउज़र शील्ड सक्रिय'
                : 'Browser Shield Armed'
              : lang === 'hi'
              ? 'AI जोखिम इंजन तैयार'
              : 'AI Risk Detection Ready'}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="toggle-3d-exploded-btn"
            onClick={() => {
              setExploded((prev) => !prev);
              setHoveredLayer(!exploded ? 'Exploded 4-Layer Shield' : 'AI Risk Engine Ready');
            }}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1 border whitespace-nowrap shrink-0 ${
              exploded
                ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                : 'bg-[#090D1A]/90 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <Layers className="w-3 h-3 shrink-0" />
            <span>{exploded ? 'Assemble' : 'Layers'}</span>
          </button>

          <button
            type="button"
            data-testid="pulse-3d-scan-btn"
            onClick={triggerPulseScan}
            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#090D1A]/90 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-[11px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <ScanLine className="w-3 h-3 shrink-0" />
            <span>Pulse Scan</span>
          </button>
        </div>
      </div>

      {/* Reserved-Dimension Visual Viewport: Static SVG First -> Smooth 3D Crossfade */}
      <div className="relative w-full h-[270px] sm:h-[295px] flex items-center justify-center overflow-hidden">
        {/* 1. Immediate Static SVG Shield (Visible immediately on load & on fallback) */}
        <StaticShieldSvg
          mode={mode}
          installedInBrowser={installedInBrowser}
          reducedMotion={lifecycle.reducedMotion}
          isVisible={lifecycle.isStaticSvgVisible}
        />

        {/* 2. Asynchronous Three.js 3D Shield Canvas (Crossfades in ONLY after first rendered frame) */}
        <div
          ref={mountRef}
          data-testid="hero-3d-canvas-host"
          data-visible={lifecycle.is3DCanvasVisible ? 'true' : 'false'}
          aria-label="Interactive 3D OpenShield AI Protection Core"
          className={`w-full h-full cursor-grab active:cursor-grabbing select-none transition-opacity duration-500 ease-out ${
            lifecycle.is3DCanvasVisible ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        />
      </div>

      {/* Subtle Scanning Status Strip (Communicates capability without implying pre-completed user scan) */}
      <div className="relative z-20 px-4 py-3 bg-[#050814]/95 border-t border-slate-800/90 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-200 font-semibold truncate">{hoveredLayer}</span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-slate-400 text-[11px] whitespace-nowrap hidden sm:inline">
            {lang === 'hi' ? '14 नियम सक्रिय' : '14 Signatures Ready'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!installedInBrowser && onActivateBrowserShield ? (
            <button
              type="button"
              onClick={onActivateBrowserShield}
              className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 font-bold text-[11px] cursor-pointer transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>{lang === 'hi' ? 'शील्ड सक्रिय करें' : 'Arm Shield'}</span>
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>Manifest V3 Armed</span>
            </span>
          )}
          {exploded && (
            <button
              type="button"
              onClick={() => setExploded(false)}
              title="Reset 3D View"
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
