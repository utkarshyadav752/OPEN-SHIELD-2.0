/**
 * Pure state machine and environment capability helpers for the OpenShield
 * "Static SVG First, Then Smooth 3D Transition" hero shield lifecycle.
 */

export type ShieldRenderStage = 'svg-initial' | 'initializing-3d' | '3d-active' | 'svg-fallback';

export type ShieldFallbackReason =
  | 'none'
  | 'webgl-unavailable'
  | 'context-lost'
  | 'init-error'
  | 'init-timeout'
  | 'forced-svg';

export interface ShieldLifecycleState {
  stage: ShieldRenderStage;
  isStaticSvgVisible: boolean;
  is3DCanvasVisible: boolean;
  hasAttemptedInit: boolean;
  firstFrameRendered: boolean;
  reducedMotion: boolean;
  isOffscreenOrHidden: boolean;
  fallbackReason: ShieldFallbackReason;
}

export type ShieldLifecycleEvent =
  | { type: 'START_3D_INIT' }
  | { type: 'FIRST_FRAME_RENDERED' }
  | { type: 'WEBGL_UNAVAILABLE' }
  | { type: 'INIT_ERROR' }
  | { type: 'INIT_TIMEOUT' }
  | { type: 'CONTEXT_LOST' }
  | { type: 'FORCE_STATIC_SVG' }
  | { type: 'SET_REDUCED_MOTION'; reducedMotion: boolean }
  | { type: 'SET_VISIBILITY'; isOffscreenOrHidden: boolean };

export function createInitialShieldLifecycleState(options?: {
  reducedMotion?: boolean;
  forceStaticSvg?: boolean;
}): ShieldLifecycleState {
  if (options?.forceStaticSvg) {
    return {
      stage: 'svg-fallback',
      isStaticSvgVisible: true,
      is3DCanvasVisible: false,
      hasAttemptedInit: true,
      firstFrameRendered: false,
      reducedMotion: Boolean(options?.reducedMotion),
      isOffscreenOrHidden: false,
      fallbackReason: 'forced-svg',
    };
  }

  return {
    stage: 'svg-initial',
    isStaticSvgVisible: true,
    is3DCanvasVisible: false,
    hasAttemptedInit: false,
    firstFrameRendered: false,
    reducedMotion: Boolean(options?.reducedMotion),
    isOffscreenOrHidden: false,
    fallbackReason: 'none',
  };
}

export function transitionShieldLifecycle(
  state: ShieldLifecycleState,
  event: ShieldLifecycleEvent
): ShieldLifecycleState {
  switch (event.type) {
    case 'FORCE_STATIC_SVG':
      return {
        ...state,
        stage: 'svg-fallback',
        isStaticSvgVisible: true,
        is3DCanvasVisible: false,
        hasAttemptedInit: true,
        fallbackReason: 'forced-svg',
      };

    case 'START_3D_INIT':
      // Never retry failed initialization once in svg-fallback or after an attempt
      if (state.stage === 'svg-fallback' || state.hasAttemptedInit) {
        return state;
      }
      return {
        ...state,
        stage: 'initializing-3d',
        isStaticSvgVisible: true,
        is3DCanvasVisible: false,
        hasAttemptedInit: true,
      };

    case 'FIRST_FRAME_RENDERED':
      if (state.stage === 'svg-fallback') {
        return state;
      }
      return {
        ...state,
        stage: '3d-active',
        isStaticSvgVisible: false,
        is3DCanvasVisible: true,
        hasAttemptedInit: true,
        firstFrameRendered: true,
        fallbackReason: 'none',
      };

    case 'WEBGL_UNAVAILABLE':
      return {
        ...state,
        stage: 'svg-fallback',
        isStaticSvgVisible: true,
        is3DCanvasVisible: false,
        hasAttemptedInit: true,
        firstFrameRendered: false,
        fallbackReason: 'webgl-unavailable',
      };

    case 'INIT_ERROR':
      return {
        ...state,
        stage: 'svg-fallback',
        isStaticSvgVisible: true,
        is3DCanvasVisible: false,
        hasAttemptedInit: true,
        firstFrameRendered: false,
        fallbackReason: 'init-error',
      };

    case 'INIT_TIMEOUT':
      if (state.stage === '3d-active' && state.firstFrameRendered) {
        return state;
      }
      return {
        ...state,
        stage: 'svg-fallback',
        isStaticSvgVisible: true,
        is3DCanvasVisible: false,
        hasAttemptedInit: true,
        firstFrameRendered: false,
        fallbackReason: 'init-timeout',
      };

    case 'CONTEXT_LOST':
      return {
        ...state,
        stage: 'svg-fallback',
        isStaticSvgVisible: true,
        is3DCanvasVisible: false,
        hasAttemptedInit: true,
        firstFrameRendered: false,
        fallbackReason: 'context-lost',
      };

    case 'SET_REDUCED_MOTION':
      return {
        ...state,
        reducedMotion: event.reducedMotion,
      };

    case 'SET_VISIBILITY':
      return {
        ...state,
        isOffscreenOrHidden: event.isOffscreenOrHidden,
      };

    default:
      return state;
  }
}

export function shouldAnimate3DLoop(state: ShieldLifecycleState): boolean {
  if (state.stage !== '3d-active') return false;
  if (state.isOffscreenOrHidden) return false;
  if (state.reducedMotion) return false;
  return true;
}

export function computeAdaptiveParticleCount(options: {
  isMobileViewport: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}): number {
  if (options.reducedMotion) return 6;
  if (options.isSoftwareGl) return 10;
  if (options.isMobileViewport) return 12;
  return 24;
}
