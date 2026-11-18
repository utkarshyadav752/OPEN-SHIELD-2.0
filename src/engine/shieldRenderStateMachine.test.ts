import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialShieldLifecycleState,
  transitionShieldLifecycle,
  shouldAnimate3DLoop,
  computeAdaptiveParticleCount,
} from './shieldRenderStateMachine.ts';

describe('OpenShield Static-SVG-First -> 3D Transition State Machine', () => {
  it('starts immediately with static SVG visible and 3D canvas hidden', () => {
    const initial = createInitialShieldLifecycleState();
    assert.equal(initial.stage, 'svg-initial');
    assert.equal(initial.isStaticSvgVisible, true);
    assert.equal(initial.is3DCanvasVisible, false);
    assert.equal(initial.firstFrameRendered, false);
  });

  it('keeps static SVG visible while 3D initializes and crossfades only after FIRST_FRAME_RENDERED', () => {
    let state = createInitialShieldLifecycleState();
    state = transitionShieldLifecycle(state, { type: 'START_3D_INIT' });
    assert.equal(state.stage, 'initializing-3d');
    assert.equal(state.isStaticSvgVisible, true);
    assert.equal(state.is3DCanvasVisible, false);

    state = transitionShieldLifecycle(state, { type: 'FIRST_FRAME_RENDERED' });
    assert.equal(state.stage, '3d-active');
    assert.equal(state.isStaticSvgVisible, false);
    assert.equal(state.is3DCanvasVisible, true);
    assert.equal(state.firstFrameRendered, true);
  });

  it('falls back to static SVG and prevents repeated retries when WebGL fails or times out', () => {
    let state = createInitialShieldLifecycleState();
    state = transitionShieldLifecycle(state, { type: 'START_3D_INIT' });
    state = transitionShieldLifecycle(state, { type: 'WEBGL_UNAVAILABLE' });

    assert.equal(state.stage, 'svg-fallback');
    assert.equal(state.isStaticSvgVisible, true);
    assert.equal(state.is3DCanvasVisible, false);
    assert.equal(state.fallbackReason, 'webgl-unavailable');

    // Attempt to re-run START_3D_INIT must be ignored (no infinite retry loops)
    const retryState = transitionShieldLifecycle(state, { type: 'START_3D_INIT' });
    assert.equal(retryState.stage, 'svg-fallback');
    assert.equal(retryState.isStaticSvgVisible, true);
  });

  it('reverts cleanly to static SVG if WebGL context is lost after 3D activation', () => {
    let state = createInitialShieldLifecycleState();
    state = transitionShieldLifecycle(state, { type: 'START_3D_INIT' });
    state = transitionShieldLifecycle(state, { type: 'FIRST_FRAME_RENDERED' });
    assert.equal(state.is3DCanvasVisible, true);

    state = transitionShieldLifecycle(state, { type: 'CONTEXT_LOST' });
    assert.equal(state.stage, 'svg-fallback');
    assert.equal(state.isStaticSvgVisible, true);
    assert.equal(state.is3DCanvasVisible, false);
    assert.equal(state.fallbackReason, 'context-lost');
  });

  it('pauses continuous 3D animation when reduced-motion is enabled or hero is off-screen', () => {
    let state = createInitialShieldLifecycleState();
    state = transitionShieldLifecycle(state, { type: 'START_3D_INIT' });
    state = transitionShieldLifecycle(state, { type: 'FIRST_FRAME_RENDERED' });
    assert.equal(shouldAnimate3DLoop(state), true);

    state = transitionShieldLifecycle(state, { type: 'SET_REDUCED_MOTION', reducedMotion: true });
    assert.equal(shouldAnimate3DLoop(state), false);

    state = transitionShieldLifecycle(state, { type: 'SET_REDUCED_MOTION', reducedMotion: false });
    state = transitionShieldLifecycle(state, {
      type: 'SET_VISIBILITY',
      isOffscreenOrHidden: true,
    });
    assert.equal(shouldAnimate3DLoop(state), false);
  });

  it('adapts particle counts for mobile, software WebGL, and reduced-motion', () => {
    assert.equal(
      computeAdaptiveParticleCount({
        isMobileViewport: false,
        isSoftwareGl: false,
        reducedMotion: false,
      }),
      24
    );
    assert.equal(
      computeAdaptiveParticleCount({
        isMobileViewport: true,
        isSoftwareGl: false,
        reducedMotion: false,
      }),
      12
    );
    assert.equal(
      computeAdaptiveParticleCount({
        isMobileViewport: false,
        isSoftwareGl: false,
        reducedMotion: true,
      }),
      6
    );
  });
});
