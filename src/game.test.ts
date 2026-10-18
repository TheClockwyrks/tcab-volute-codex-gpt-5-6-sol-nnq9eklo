import { beforeAll, describe, expect, it } from "vitest";
import type { DeepReadonly } from "ts-essentials";
import { CELLS, CHAIN_RESET, LEVELS } from "./constants";
import { game, type VoluteDebugApi, type VoluteState } from "./game";

let initial: VoluteState;
let debug: VoluteDebugApi;

beforeAll(async () => {
  const api = {
    input: { register() {} },
    audio: { async load() {} },
    assets: {
      async loadImage() {
        return { width: 1, height: 1 };
      },
      async load() {
        return new Blob([
          JSON.stringify({
            dimensions: 2,
            field: { width: 960, height: 540 },
            durationMs: 1,
            fps: 60,
            loop: false,
            emitters: [],
          }),
        ]);
      },
    },
    diagnostics: { register() {} },
  };
  [initial, debug] = await game.initialize(api as never);
});

function apply(
  state: VoluteState,
  transition: (s: DeepReadonly<VoluteState>) => VoluteState,
): VoluteState {
  return transition(state);
}

describe("Volute debug surface", () => {
  it("opens with the complete title state", () => {
    const snap = debug.snapshot(initial);
    expect(snap).toMatchObject({
      version: 1,
      screen: "title",
      score: 0,
      level: 1,
      cells: CELLS,
      quotaRemaining: LEVELS[0].quota,
      train: [],
      segments: [],
    });
  });

  it("starts a level with twelve ordered, marked seeded cores", () => {
    const state = apply(initial, (s) => debug.startLevel(s, 3));
    const snap = debug.snapshot(state);
    expect(snap.screen).toBe("playing");
    expect(snap.level).toBe(3);
    expect(snap.train).toHaveLength(12);
    expect(snap.train[0].s).toBe(308);
    expect(snap.train[11]).toMatchObject({ s: 0, mark: "choke" });
    expect(snap.quotaRemaining).toBe(LEVELS[2].quota - 12);
  });

  it("orders a posed train and derives its segments and channel points", () => {
    let state = debug.poseTrain(initial, [
      [20, "cobalt", null],
      [104, "halide", "bore"],
      [76, "sulfur", null],
    ]);
    state = debug.reconcile(state);
    const snap = debug.snapshot(state);
    expect(snap.train.map((core) => core.s)).toEqual([104, 76, 20]);
    expect(snap.segments.map((segment) => segment.count)).toEqual([2, 1]);
    expect(snap.train[0]).toMatchObject({ x: 144, y: 40, segment: 0 });
    expect(snap.train[2].segment).toBe(1);
  });

  it("normalizes aim and validates bounded poses", () => {
    expect(debug.setAim(initial, -90).aim).toBe(270);
    expect(debug.setChainStep(initial, 4)).toMatchObject({
      chainStep: 4,
      chainTimer: CHAIN_RESET,
    });
    expect(() => debug.setCells(initial, CELLS + 1)).toThrow(RangeError);
    expect(() => debug.setLevel(initial, 0)).toThrow(RangeError);
  });

  it("reset preserves driver gates and mute while restoring run values", () => {
    let state = debug.setEmission(initial, false);
    state = debug.setFeed(state, false);
    state = { ...state, muted: true, score: 999, cells: 0 };
    expect(debug.reset(state)).toMatchObject({
      screen: "title",
      score: 0,
      cells: CELLS,
      emission: false,
      feed: false,
      muted: true,
    });
  });
});
