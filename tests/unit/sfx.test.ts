import { afterEach, describe, expect, it, vi } from 'vitest';
import { play, setSfxOptions, type Sfx } from '../../src/game/sfx';

const ALL: Sfx[] = ['correct', 'wrong', 'streak', 'levelup', 'badge', 'stamp', 'takeoff', 'landing', 'tick', 'timeout', 'tap'];

describe('sound effects & haptics', () => {
  afterEach(() => { vi.unstubAllGlobals(); setSfxOptions({ sound: true, haptics: true }); });

  it('never throws, even without Web Audio (old browsers, tests)', () => {
    setSfxOptions({ sound: true, haptics: true });
    for (const s of ALL) expect(() => play(s)).not.toThrow();
  });

  it('vibrates only when haptics are on', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    setSfxOptions({ sound: false, haptics: true });
    play('wrong');
    expect(vibrate).toHaveBeenCalledWith([60, 40, 60]);
    vibrate.mockClear();
    setSfxOptions({ sound: false, haptics: false });
    play('wrong');
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('builds an audio graph when sound is on, and stays silent when off', () => {
    const started: number[] = [];
    class FakeParam { value = 0; setValueAtTime() { return this; } exponentialRampToValueAtTime() { return this; } }
    class FakeNode { gain = new FakeParam(); frequency = new FakeParam(); Q = new FakeParam(); type = ''; buffer: unknown = null; connect(n: unknown) { return n; } start(t: number) { started.push(t); } stop() {} }
    class FakeCtx {
      state = 'running'; currentTime = 1; sampleRate = 8000; destination = new FakeNode();
      createGain() { return new FakeNode(); } createOscillator() { return new FakeNode(); } createBiquadFilter() { return new FakeNode(); } createBufferSource() { return new FakeNode(); }
      createBuffer(_c: number, len: number) { return { getChannelData: () => new Float32Array(len) }; } resume() { return Promise.resolve(); }
    }
    vi.stubGlobal('AudioContext', FakeCtx);
    setSfxOptions({ sound: false, haptics: false });
    play('levelup');
    expect(started).toHaveLength(0);
    setSfxOptions({ sound: true, haptics: false });
    play('levelup');
    expect(started.length).toBeGreaterThanOrEqual(4); // a 4-note fanfare (+ harmony)
  });
});
