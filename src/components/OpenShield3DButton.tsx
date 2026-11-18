import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Check, Shield } from 'lucide-react';

export interface OpenShield3DButtonProps {
  installedInBrowser: boolean;
  onClick: () => void;
  label: string;
  installedLabel: string;
  size?: 'sm' | 'lg';
  testId?: string;
}

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const r = Math.min(radius, width / 2 - 0.02, height / 2 - 0.02);
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  return shape;
}

export const OpenShield3DButton: React.FC<OpenShield3DButtonProps> = ({
  installedInBrowser,
  onClick,
  label,
  installedLabel,
  size = 'lg',
  testId,
}) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [tiltCss, setTiltCss] = useState({ rx: 0, ry: 0, tz: 0 });

  const pointerRef = useRef<{
    nx: number;
    ny: number;
    hovered: boolean;
    pressed: boolean;
  }>({
    nx: 0,
    ny: 0,
    hovered: false,
    pressed: false,
  });

  const installedRef = useRef(installedInBrowser);
  useEffect(() => {
    installedRef.current = installedInBrowser;
  }, [installedInBrowser]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const isHeadlessOrAutomated =
      typeof navigator !== 'undefined' && navigator.webdriver === true;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isHeadlessOrAutomated,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const width = host.clientWidth || (size === 'lg' ? 216 : 172);
    const height = host.clientHeight || (size === 'lg' ? 54 : 40);

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl =
      isHeadlessOrAutomated || /swiftshader|llvmpipe|softpipe|software/i.test(rendererName);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;

    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const aspect = width / Math.max(height, 1);
    const fov = 26;
    const camZ = 5.0;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 50);
    camera.position.set(0, 0, camZ);

    // Compute exact visible frustum size at z = 0 so the 3D mesh fills the full button silhouette
    const vHeight = 2 * camZ * Math.tan((fov * Math.PI) / 360);
    const vWidth = vHeight * aspect;

    const meshH = vHeight * 0.78;
    const meshW = vWidth * 0.91;
    const cornerR = size === 'lg' ? meshH * 0.34 : meshH * 0.46;

    // Studio Lighting for 3D Beveled Forensic Button Mesh
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3.5, 4.0, 5.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(-4.0, -2.5, 3.0);
    scene.add(rimLight);

    // Interactive cursor-tracking specular point light
    const cursorLight = new THREE.PointLight(0x7dd3fc, 2.8, 12);
    cursorLight.position.set(0, 0, 2.4);
    scene.add(cursorLight);

    // Root 3D Button Mesh Group
    const buttonMeshGroup = new THREE.Group();
    scene.add(buttonMeshGroup);

    // 1. Full-Width Outer Metallic Beveled Chassis Mesh
    const baseShape = createRoundedRectShape(meshW, meshH, cornerR);
    const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.09,
      bevelThickness: 0.1,
    });
    baseGeo.center();

    const baseMat = new THREE.MeshStandardMaterial({
      color: installedRef.current ? 0x047857 : 0x0842a0,
      emissive: installedRef.current ? 0x064e3b : 0x172554,
      emissiveIntensity: 0.5,
      metalness: 0.38,
      roughness: 0.24,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    buttonMeshGroup.add(baseMesh);

    // 2. Full-Width Raised Top Faceplate Mesh with Specular Bevel
    const faceShape = createRoundedRectShape(meshW - 0.22, meshH - 0.2, Math.max(0.18, cornerR - 0.06));
    const faceGeo = new THREE.ExtrudeGeometry(faceShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05,
    });
    faceGeo.center();

    const faceMat = new THREE.MeshStandardMaterial({
      color: installedRef.current ? 0x059669 : 0x0b57d0,
      emissive: installedRef.current ? 0x047857 : 0x1d4ed8,
      emissiveIntensity: 0.38,
      metalness: 0.22,
      roughness: 0.2,
    });
    const faceMesh = new THREE.Mesh(faceGeo, faceMat);
    faceMesh.position.z = 0.14;
    buttonMeshGroup.add(faceMesh);

    // 3. Outer Perimeter Bevel Rim Highlight
    const rimEdgesGeo = new THREE.EdgesGeometry(baseGeo, 28);
    const rimEdgesMat = new THREE.LineBasicMaterial({
      color: installedRef.current ? 0x6ee7b7 : 0x7dd3fc,
      transparent: true,
      opacity: 0.42,
    });
    const rimWireframe = new THREE.LineSegments(rimEdgesGeo, rimEdgesMat);
    rimWireframe.position.z = 0.02;
    buttonMeshGroup.add(rimWireframe);

    // 4. 3D Specular Light-Sweep Bar across full button surface on hover
    const sweepGeo = new THREE.PlaneGeometry(0.65, meshH * 0.92);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
    sweepMesh.position.set(-meshW * 0.5, 0, 0.26);
    sweepMesh.rotation.z = -0.22;
    buttonMeshGroup.add(sweepMesh);

    let disposed = false;
    let rafId = 0;
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
    let prevTime = startTime;

    const primaryBlue = new THREE.Color(0x0842a0);
    const hoverBlue = new THREE.Color(0x1d4ed8);
    const faceBlue = new THREE.Color(0x0b57d0);
    const emissiveBlue = new THREE.Color(0x1e3a8a);

    const primaryGreen = new THREE.Color(0x047857);
    const hoverGreen = new THREE.Color(0x10b981);
    const faceGreen = new THREE.Color(0x059669);
    const emissiveGreen = new THREE.Color(0x065f46);

    const rimCyan = new THREE.Color(0x7dd3fc);
    const rimEmerald = new THREE.Color(0x6ee7b7);

    let lastRenderedInstalled = installedRef.current;
    let lastWasActive = true;

    const animate = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - prevTime) * 0.001, 0.1);
      prevTime = now;
      const elapsed = (now - startTime) * 0.001;
      const damp = 1 - Math.exp(-14 * dt);

      const { nx, ny, hovered, pressed } = pointerRef.current;
      const isInstalled = installedRef.current;

      // Subtle idle breathing on hardware GPU + responsive pointer hover depth-tilt on all devices
      const idleRx = isSoftwareGl ? 0 : Math.sin(elapsed * 2.0) * 0.025;
      const idleRy = isSoftwareGl ? 0 : Math.cos(elapsed * 1.6) * 0.035;

      const targetRx = hovered ? -ny * 0.26 : idleRx;
      const targetRy = hovered ? nx * 0.28 : idleRy;
      const targetZ = pressed ? -0.14 : hovered ? 0.18 : 0;
      const targetScale = pressed ? 0.97 : hovered ? 1.025 : 1.0;

      buttonMeshGroup.rotation.x = THREE.MathUtils.lerp(buttonMeshGroup.rotation.x, targetRx, damp);
      buttonMeshGroup.rotation.y = THREE.MathUtils.lerp(buttonMeshGroup.rotation.y, targetRy, damp);
      buttonMeshGroup.position.z = THREE.MathUtils.lerp(buttonMeshGroup.position.z, targetZ, damp);

      const nextScale = THREE.MathUtils.lerp(buttonMeshGroup.scale.x, targetScale, damp);
      buttonMeshGroup.scale.setScalar(nextScale);

      if (buttonRef.current) {
        buttonRef.current.dataset.meshRx = buttonMeshGroup.rotation.x.toFixed(3);
        buttonRef.current.dataset.meshRy = buttonMeshGroup.rotation.y.toFixed(3);
      }

      // Move specular point light across the full 3D button width
      const targetLightX = hovered ? nx * (meshW * 0.48) : Math.sin(elapsed * 1.4) * (meshW * 0.25);
      const targetLightY = hovered ? ny * (meshH * 0.45) : Math.cos(elapsed * 1.1) * (meshH * 0.2);
      cursorLight.position.x = THREE.MathUtils.lerp(cursorLight.position.x, targetLightX, damp);
      cursorLight.position.y = THREE.MathUtils.lerp(cursorLight.position.y, targetLightY, damp);
      cursorLight.intensity = THREE.MathUtils.lerp(
        cursorLight.intensity,
        hovered ? 4.2 : 2.2,
        damp
      );

      // Update colors smoothly between Ready (Cobalt) and Armed (Emerald)
      const targetBaseColor = isInstalled
        ? hovered
          ? faceGreen
          : primaryGreen
        : hovered
        ? faceBlue
        : primaryBlue;
      const targetFaceColor = isInstalled
        ? hovered
          ? hoverGreen
          : faceGreen
        : hovered
        ? hoverBlue
        : faceBlue;
      const targetEmissive = isInstalled ? emissiveGreen : emissiveBlue;

      baseMat.color.lerp(targetBaseColor, damp);
      faceMat.color.lerp(targetFaceColor, damp);
      baseMat.emissive.lerp(targetEmissive, damp);
      faceMat.emissive.lerp(targetEmissive, damp);

      baseMat.emissiveIntensity = THREE.MathUtils.lerp(
        baseMat.emissiveIntensity,
        hovered ? 0.68 : 0.45,
        damp
      );
      faceMat.emissiveIntensity = THREE.MathUtils.lerp(
        faceMat.emissiveIntensity,
        hovered ? 0.58 : 0.36,
        damp
      );

      rimEdgesMat.color.lerp(isInstalled ? rimEmerald : rimCyan, damp);
      rimEdgesMat.opacity = THREE.MathUtils.lerp(
        rimEdgesMat.opacity,
        hovered ? 0.85 : 0.38,
        damp
      );

      // Hover specular sweep bar animation across the full button width
      if (hovered) {
        const sweepSpan = meshW * 1.1;
        sweepMesh.position.x = ((elapsed * 3.8) % sweepSpan) - sweepSpan * 0.5;
        sweepMat.opacity = THREE.MathUtils.lerp(sweepMat.opacity, 0.18, damp);
      } else {
        sweepMat.opacity = THREE.MathUtils.lerp(sweepMat.opacity, 0.0, damp);
      }

      const isSettling =
        Math.abs(buttonMeshGroup.rotation.x - targetRx) > 0.002 ||
        Math.abs(buttonMeshGroup.rotation.y - targetRy) > 0.002 ||
        Math.abs(buttonMeshGroup.position.z - targetZ) > 0.002;
      const isActiveNow =
        hovered || pressed || isSettling || isInstalled !== lastRenderedInstalled;

      if (!isSoftwareGl || isActiveNow || lastWasActive) {
        renderer?.render(scene, camera);
        lastRenderedInstalled = isInstalled;
        lastWasActive = isActiveNow;
      }

      afterDraw(animate);
    };

    animate();

    const handleResize = () => {
      if (!host || !renderer) return;
      const w = host.clientWidth || (size === 'lg' ? 216 : 172);
      const h = host.clientHeight || (size === 'lg' ? 54 : 40);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
      baseGeo.dispose();
      baseMat.dispose();
      faceGeo.dispose();
      faceMat.dispose();
      rimEdgesGeo.dispose();
      rimEdgesMat.dispose();
      sweepGeo.dispose();
      sweepMat.dispose();
      renderer?.dispose();
    };
  }, [size]);

  const updatePointerTilt = (clientX: number, clientY: number, currentTarget: HTMLButtonElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const nx = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const ny = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    const clampedX = Math.max(-1, Math.min(1, nx));
    const clampedY = Math.max(-1, Math.min(1, ny));

    pointerRef.current.nx = clampedX;
    pointerRef.current.ny = clampedY;
    pointerRef.current.hovered = true;

    const rx = Number((-clampedY * 8).toFixed(2));
    const ry = Number((clampedX * 10).toFixed(2));

    currentTarget.setAttribute('data-3d-tilt-active', 'true');
    currentTarget.setAttribute('data-tilt-rx', String(rx));
    currentTarget.setAttribute('data-tilt-ry', String(ry));

    setIsHovered(true);
    setTiltCss({
      rx,
      ry,
      tz: isPressed ? -2 : 4,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    updatePointerTilt(e.clientX, e.clientY, e.currentTarget);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    updatePointerTilt(e.clientX, e.clientY, e.currentTarget);
  };

  const handleEnter = (e: React.SyntheticEvent<HTMLButtonElement>) => {
    pointerRef.current.hovered = true;
    e.currentTarget.setAttribute('data-3d-tilt-active', 'true');
    setIsHovered(true);
    setTiltCss((prev) => ({ ...prev, tz: 4 }));
  };

  const handleLeave = (e: React.SyntheticEvent<HTMLButtonElement>) => {
    pointerRef.current.nx = 0;
    pointerRef.current.ny = 0;
    pointerRef.current.hovered = false;
    pointerRef.current.pressed = false;
    e.currentTarget.setAttribute('data-3d-tilt-active', 'false');
    e.currentTarget.setAttribute('data-tilt-rx', '0');
    e.currentTarget.setAttribute('data-tilt-ry', '0');
    setIsHovered(false);
    setIsPressed(false);
    setTiltCss({ rx: 0, ry: 0, tz: 0 });
  };

  const handlePointerDown = () => {
    pointerRef.current.pressed = true;
    setIsPressed(true);
    setTiltCss((prev) => ({ ...prev, tz: -2 }));
  };

  const handlePointerUp = () => {
    pointerRef.current.pressed = false;
    setIsPressed(false);
    setTiltCss((prev) => ({ ...prev, tz: isHovered ? 4 : 0 }));
  };

  const isLarge = size === 'lg';

  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid={testId}
      data-3d-mesh="ready"
      data-3d-tilt-active={isHovered ? 'true' : 'false'}
      data-tilt-rx={tiltCss.rx}
      data-tilt-ry={tiltCss.ry}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onMouseMove={handleMouseMove}
      onPointerEnter={handleEnter}
      onMouseEnter={handleEnter}
      onPointerLeave={handleLeave}
      onMouseLeave={handleLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={`group relative inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer select-none overflow-hidden transition-shadow duration-200 ${
        isLarge
          ? 'w-full sm:w-auto h-[54px] min-w-[216px] px-7 rounded-2xl text-sm font-extrabold'
          : 'h-[40px] min-w-[172px] px-5 rounded-full text-xs font-extrabold'
      } ${
        installedInBrowser
          ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-500/45'
          : 'bg-[#0842a0] text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-500/45'
      }`}
    >
      {/* Three.js Full-Width 3D Beveled Button Mesh Layer */}
      <div
        ref={canvasHostRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Specular 3D Top Bevel Edge Ring */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-[inherit] border transition-colors duration-200 ${
          installedInBrowser
            ? isHovered
              ? 'border-emerald-300/80'
              : 'border-emerald-400/40'
            : isHovered
            ? 'border-sky-300/85'
            : 'border-sky-400/40'
        }`}
      />

      {/* Synchronized Depth-Tilted Foreground Label & Icon */}
      <span
        className={`relative z-10 inline-flex items-center justify-center gap-2 transition-transform duration-150 ease-out drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] ${
          isHovered && !isPressed ? '-translate-y-[1px] scale-[1.03]' : ''
        } ${isPressed ? 'translate-y-[1px] scale-[0.98]' : ''}`}
      >
        {installedInBrowser ? (
          <>
            <Check className={`${isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'} shrink-0`} />
            <span>{installedLabel}</span>
          </>
        ) : (
          <>
            <Shield className={`${isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'} shrink-0`} />
            <span>{label}</span>
          </>
        )}
      </span>
    </button>
  );
};
