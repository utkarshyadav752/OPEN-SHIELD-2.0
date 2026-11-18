import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Layers, Eye, Shield } from 'lucide-react';

// Pre-allocated module-scope scratch objects (zero GC inside animation loop)
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyEuler = new THREE.Euler();
const _tempColor = new THREE.Color();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3(0, 1.8, 0);

export type ShieldMode = 'guard' | 'neutralize' | 'inspect';
export type ShieldFinish = 'titanium' | 'emerald' | 'obsidian';
export type CameraPreset = 'isometric' | 'front' | 'top';

function createProceduralBrushedBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 600; i++) {
      const y = Math.random() * 256;
      const shade = Math.floor(105 + Math.random() * 50);
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createShieldShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, radius * 1.15);
  shape.lineTo(radius * 0.92, radius * 0.72);
  shape.quadraticCurveTo(radius * 0.96, -radius * 0.15, 0, -radius * 1.18);
  shape.quadraticCurveTo(-radius * 0.96, -radius * 0.15, -radius * 0.92, radius * 0.72);
  shape.closePath();
  return shape;
}

export const OpenShield3DShowcase: React.FC = () => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [shieldMode, setShieldMode] = useState<ShieldMode>('guard');
  const [finish, setFinish] = useState<ShieldFinish>('titanium');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [exploded, setExploded] = useState<number>(0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Store UI state in refs so WebGL scene never re-initializes on React state changes
  const stateRef = useRef({
    shieldMode: 'guard' as ShieldMode,
    finish: 'titanium' as ShieldFinish,
    cameraPreset: 'isometric' as CameraPreset,
    exploded: 0,
    cameraTransitionActive: false
  });

  useEffect(() => {
    stateRef.current.shieldMode = shieldMode;
  }, [shieldMode]);

  useEffect(() => {
    stateRef.current.finish = finish;
  }, [finish]);

  useEffect(() => {
    stateRef.current.cameraPreset = cameraPreset;
    stateRef.current.cameraTransitionActive = true;
  }, [cameraPreset]);

  useEffect(() => {
    stateRef.current.exploded = exploded;
  }, [exploded]);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    // 1. Software-WebGL Detection (Three.js skill section 2.1)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mountEl.clientWidth || 860;
    const height = mountEl.clientHeight || 480;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonColor = 0x0b1120;
    scene.background = new THREE.Color(horizonColor);
    scene.fog = new THREE.FogExp2(horizonColor, 0.035);

    // 2. Studio RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(3.8, 2.7, 5.2);
    camera.lookAt(0, 1.8, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.8, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 2.6;
    controls.maxDistance = 11;

    controls.addEventListener('start', () => {
      stateRef.current.cameraTransitionActive = false;
    });

    // 3. Balanced Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4dc, 2.2);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    const d = 4.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 1.4);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const bumpTex = createProceduralBrushedBumpTexture(maxAnisotropy);
    const contactShadowTex = createRadialContactShadowTexture();

    // 4. Ground Floor + Disjoint Contact Shadow Disc (y offset >= 0.02)
    const floorGeo = new THREE.CircleGeometry(18, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.15
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(18, 24, 0x1e293b, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const shadowDiscGeo = new THREE.CircleGeometry(2.4, 32);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const shadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.02;
    scene.add(shadowDisc);

    // 5. Composite 9-Part Procedural OpenShield Guardian Model (THREE.Group pivoted at y=0)
    const guardianRoot = new THREE.Group();
    guardianRoot.position.set(0, 0, 0);
    scene.add(guardianRoot);

    // Part 1: Grounded Pedestal Base (flush at y=0)
    const pedestalGeo = new THREE.CylinderGeometry(1.15, 1.35, 0.28, 32);
    pedestalGeo.translate(0, 0.14, 0);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.55,
      bumpMap: bumpTex,
      bumpScale: 0.015
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.castShadow = !isSoftwareGl;
    pedestalMesh.receiveShadow = !isSoftwareGl;
    guardianRoot.add(pedestalMesh);

    // Part 2: Pedestal Emitter Ring
    const emitterRingGeo = new THREE.TorusGeometry(1.05, 0.045, 16, 48);
    const emitterRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.8
    });
    const emitterRingMesh = new THREE.Mesh(emitterRingGeo, emitterRingMat);
    emitterRingMesh.rotation.x = Math.PI / 2;
    emitterRingMesh.position.y = 0.29;
    guardianRoot.add(emitterRingMesh);

    // Floating Shield Assembly Sub-Group (pivoted around y = 1.95)
    const shieldAssembly = new THREE.Group();
    shieldAssembly.position.set(0, 1.95, 0);
    guardianRoot.add(shieldAssembly);

    // Part 3: Primary Silhouette — Beveled Outer Shield Hull (ExtrudeGeometry)
    const outerShieldShape = createShieldShape(1.15);
    const outerShieldGeo = new THREE.ExtrudeGeometry(outerShieldShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06
    });
    outerShieldGeo.center();
    const hullMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      roughness: 0.22,
      metalness: 0.9,
      bumpMap: bumpTex,
      bumpScale: 0.01,
      clearcoat: 0.4
    });
    const outerHullMesh = new THREE.Mesh(outerShieldGeo, hullMat);
    outerHullMesh.castShadow = !isSoftwareGl;
    shieldAssembly.add(outerHullMesh);

    // Part 4: Secondary Read — Matte Armor Escutcheon Plate (Front Layer, roughness diff >= 0.25)
    const innerShieldShape = createShieldShape(0.88);
    const innerPlateGeo = new THREE.ExtrudeGeometry(innerShieldShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03
    });
    innerPlateGeo.center();
    const innerPlateMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.72,
      metalness: 0.35
    });
    const innerPlateMesh = new THREE.Mesh(innerPlateGeo, innerPlateMat);
    innerPlateMesh.position.z = 0.14;
    shieldAssembly.add(innerPlateMesh);

    // Part 5: Secondary Read — Rear Armor Backplate
    const backPlateMesh = new THREE.Mesh(innerPlateGeo, innerPlateMat);
    backPlateMesh.position.z = -0.14;
    shieldAssembly.add(backPlateMesh);

    // Part 6: Lathe-Turned Central Core Collar (LatheGeometry)
    const lathePoints = [
      new THREE.Vector2(0.28, -0.08),
      new THREE.Vector2(0.42, -0.04),
      new THREE.Vector2(0.46, 0.04),
      new THREE.Vector2(0.32, 0.1)
    ];
    const latheGeo = new THREE.LatheGeometry(lathePoints, 32);
    latheGeo.rotateX(Math.PI / 2);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.88
    });
    const collarMesh = new THREE.Mesh(latheGeo, collarMat);
    collarMesh.position.z = 0.22;
    shieldAssembly.add(collarMesh);

    // Part 7: Accent Detail — Central Optical Core Lens
    const coreGeo = new THREE.SphereGeometry(0.26, 28, 20);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.4
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.scale.set(1, 1, 0.55);
    coreMesh.position.z = 0.25;
    shieldAssembly.add(coreMesh);

    // Part 8: Accent Detail — 4 Structural Lock Bolts
    const boltGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.08, 16);
    boltGeo.rotateX(Math.PI / 2);
    const boltGroup = new THREE.Group();
    const boltOffsets = [
      [-0.58, 0.52, 0.2],
      [0.58, 0.52, 0.2],
      [-0.48, -0.35, 0.2],
      [0.48, -0.35, 0.2]
    ];
    boltOffsets.forEach(([bx, by, bz]) => {
      const bolt = new THREE.Mesh(boltGeo, collarMat);
      bolt.position.set(bx, by, bz);
      boltGroup.add(bolt);
    });
    shieldAssembly.add(boltGroup);

    // Part 9: Gyroscopic Interceptor Orbital Ring
    const orbitalGeo = new THREE.TorusGeometry(1.55, 0.035, 16, 64);
    const orbitalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.85
    });
    const orbitalMesh = new THREE.Mesh(orbitalGeo, orbitalMat);
    shieldAssembly.add(orbitalMesh);

    // 6. InstancedMesh: 30 Orbiting Dark-Pattern Threat Nodes (>20 instances with ±15% scale & color variation)
    const INSTANCE_COUNT = 30;
    const nodeGeo = new THREE.OctahedronGeometry(0.11, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.65
    });
    const threatInstancedMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, INSTANCE_COUNT);
    threatInstancedMesh.frustumCulled = false;

    const palette = [0xf97316, 0xef4444, 0xa855f7, 0xf59e0b];
    const orbitData = Array.from({ length: INSTANCE_COUNT }, (_, i) => {
      const angle = (i / INSTANCE_COUNT) * Math.PI * 2;
      const radius = 2.25 + (i % 4) * 0.38;
      const yOffset = 0.8 + ((i * 7) % 10) * 0.24;
      const speed = 0.45 + (i % 5) * 0.12;
      const scaleVar = 0.85 + (i % 7) * 0.05; // ±15% scale variation
      _tempColor.setHex(palette[i % palette.length]);
      threatInstancedMesh.setColorAt(i, _tempColor);
      return { angle, radius, yOffset, speed, scaleVar };
    });
    if (threatInstancedMesh.instanceColor) {
      threatInstancedMesh.instanceColor.needsUpdate = true;
    }
    threatInstancedMesh.computeBoundingSphere();
    scene.add(threatInstancedMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Animation & Software-WebGL Paced Render Loop
    let frameId = 0;
    let isDisposed = false;
    let currentExploded = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // Update Material Finish smoothly
      if (st.finish === 'titanium') {
        hullMat.color.setHex(0xdbeafe);
        hullMat.metalness = 0.9;
        hullMat.roughness = 0.22;
      } else if (st.finish === 'emerald') {
        hullMat.color.setHex(0x6ee7b7);
        hullMat.metalness = 0.82;
        hullMat.roughness = 0.26;
      } else {
        hullMat.color.setHex(0xfde68a);
        hullMat.metalness = 0.94;
        hullMat.roughness = 0.18;
      }

      // Update Shield Mode lighting & core color
      const isNeutralizing = st.shieldMode === 'neutralize';
      coreMat.color.setHex(isNeutralizing ? 0x38bdf8 : 0x10b981);
      coreMat.emissive.setHex(isNeutralizing ? 0x0284c7 : 0x059669);

      // Smoothly damp Exploded View separation
      const targetExp = st.shieldMode === 'inspect' ? Math.max(0.65, st.exploded) : st.exploded;
      currentExploded = THREE.MathUtils.damp(currentExploded, targetExp, 6, dt);

      innerPlateMesh.position.z = 0.14 + currentExploded * 0.42;
      backPlateMesh.position.z = -0.14 - currentExploded * 0.42;
      collarMesh.position.z = 0.22 + currentExploded * 0.72;
      coreMesh.position.z = 0.25 + currentExploded * 0.95;
      boltGroup.position.z = currentExploded * 1.15;

      // Gentle float & gyro rotation
      shieldAssembly.position.y = 1.95 + Math.sin(elapsed * 1.6) * 0.06;
      shieldAssembly.rotation.y = Math.sin(elapsed * 0.55) * 0.28;
      orbitalMesh.rotation.z = elapsed * (isNeutralizing ? 1.8 : 0.7);
      orbitalMesh.rotation.x = Math.sin(elapsed * 0.7) * 0.35;

      // Update Orbiting Threat Nodes InstancedMesh
      for (let i = 0; i < INSTANCE_COUNT; i++) {
        const d = orbitData[i];
        const a = d.angle + elapsed * d.speed * (isNeutralizing ? 1.8 : 1);
        const r = isNeutralizing ? d.radius + 0.55 : d.radius;
        _dummyPos.set(
          Math.cos(a) * r,
          d.yOffset + Math.sin(elapsed * 2 + i) * 0.12,
          Math.sin(a) * r
        );
        _dummyEuler.set(elapsed + i, elapsed * 0.8, 0);
        _dummyQuat.setFromEuler(_dummyEuler);
        const s = isNeutralizing ? d.scaleVar * 0.55 : d.scaleVar;
        _dummyScale.set(s, s, s);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        threatInstancedMesh.setMatrixAt(i, _dummyMatrix);

        if (isNeutralizing) {
          _tempColor.setHex(0x10b981);
        } else {
          _tempColor.setHex(palette[i % palette.length]);
        }
        threatInstancedMesh.setColorAt(i, _tempColor);
      }
      threatInstancedMesh.instanceMatrix.needsUpdate = true;
      if (threatInstancedMesh.instanceColor) {
        threatInstancedMesh.instanceColor.needsUpdate = true;
      }

      // Smooth Camera Preset Transitions
      if (st.cameraTransitionActive) {
        if (st.cameraPreset === 'front') {
          _targetCamPos.set(0, 1.95, 5.6);
        } else if (st.cameraPreset === 'top') {
          _targetCamPos.set(0, 6.8, 1.8);
        } else {
          _targetCamPos.set(3.8, 2.7, 5.2);
        }
        const alpha = 1 - Math.exp(-5 * dt);
        camera.position.lerp(_targetCamPos, alpha);
        controls.target.lerp(_targetLookAt, alpha);
        if (camera.position.distanceTo(_targetCamPos) < 0.05) {
          st.cameraTransitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!mountEl || isDisposed) return;
      const w = mountEl.clientWidth || 860;
      const h = mountEl.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="threejs-showcase"
      className="relative w-full h-[460px] sm:h-[520px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0b1120]"
    >
      {/* Dedicated WebGL Mount Container (Outside React Overlay Siblings) */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Top-Left Minimal Spec Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#0f172a] border border-slate-700/80 text-xs text-slate-200 shadow-md">
        <Shield className="w-4 h-4 text-sky-400 shrink-0" />
        <div>
          <span className="font-bold text-white">OpenShield 3D Threat Interceptor</span>
          <span className="text-slate-400 ml-2 hidden sm:inline">
            9-Part Procedural Assembly · 30 Orbiting Threat Nodes
          </span>
        </div>
      </div>

      {/* Top-Right Fullscreen Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Toggle 3D Fullscreen"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D'}</span>
        </button>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Solid surface, zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-[860px] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="px-3 py-1 rounded-t-lg bg-[#0f172a] border border-b-0 border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show 3D Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Hide Controls
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full p-3 rounded-xl bg-[#0f172a] border border-slate-700 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(
                [
                  { id: 'guard', label: 'Active Guard' },
                  { id: 'neutralize', label: 'Neutralize Wave' },
                  { id: 'inspect', label: 'Exploded Core' }
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setShieldMode(m.id);
                    if (m.id === 'inspect') setExploded(0.8);
                    else if (exploded > 0.5) setExploded(0);
                  }}
                  className={`px-2.5 py-1.5 rounded-md font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    shieldMode === m.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="exploded-slider" className="text-slate-300 font-medium whitespace-nowrap">
                Explode:
              </label>
              <input
                id="exploded-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={exploded}
                onChange={(e) => setExploded(parseFloat(e.target.value))}
                className="w-24 accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Finish Swatches */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 hidden md:inline">Finish:</span>
              {(
                [
                  { id: 'titanium', label: 'Titanium' },
                  { id: 'emerald', label: 'Emerald' },
                  { id: 'obsidian', label: 'Gold Alloy' }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFinish(f.id)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                    finish === f.id
                      ? 'bg-slate-800 text-sky-300 border-sky-500/60'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Camera Angle Pills */}
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
              {(
                [
                  { id: 'isometric', label: 'Orbit' },
                  { id: 'front', label: 'Front' },
                  { id: 'top', label: 'Top' }
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraPreset(cam.id)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                    cameraPreset === cam.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
