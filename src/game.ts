import { ParticleCanvasPlayer } from "@clockwyrks/particle-runtime/canvas";
import type { ParticleSystem } from "@clockwyrks/particle-runtime";
import type { Game, RenderApi, UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  AIM_START,
  AIM_TURN_RATE,
  BACKFLOW_SPEED,
  BINDINGS,
  BORE_RADIUS,
  CATCHUP_SPEED,
  CELLS,
  CHAIN_RESET,
  CHANNEL,
  CHARGE_IDS,
  CHOKE_FEED_MULTIPLIER,
  CLEAR_SCORE,
  CORE_RADIUS,
  CUES,
  DANGER_S,
  EXTRACT_CUES,
  FIELD_H,
  FIELD_W,
  FIRE_COOLDOWN,
  INJECTOR_X,
  INJECTOR_Y,
  INTERLUDE,
  LEVEL_COUNT,
  LEVELS,
  MACHINERY_DURATIONS,
  MACHINERY_KINDS,
  MARK_INTERVAL,
  MIN_RUN,
  PATH_LENGTH,
  PRESSURE_BLEED,
  PRESSURE_DROP_PER_CORE,
  PRESSURE_FREE,
  PRESSURE_MAX,
  PRESSURE_MIN,
  PRESSURE_RISE_PER_CORE,
  PROJECTILE_SPEED,
  RECOIL,
  RECOIL_HOLD,
  SCORE_PER_CORE,
  SEEDED_CORES,
  SEEDED_HEAD_S,
  SPACING,
  TICK_DT,
  TITLE_TEXT,
  VOLUTE_DEBUG_VERSION,
  type ChargeId,
  type MachineryKind,
  type ScreenName,
} from "./constants";

export type { ChargeId, MachineryKind, ScreenName };

export interface CoreState {
  readonly charge: ChargeId;
  readonly s: number;
  readonly mark: MachineryKind | null;
}
export interface SegmentState {
  readonly count: number;
  readonly hold: number;
}
export interface ProjectileState {
  readonly charge: ChargeId;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}
export interface MachineryState {
  readonly kind: MachineryKind;
  readonly remaining: number;
}
export interface VoluteState {
  readonly screen: ScreenName;
  readonly score: number;
  readonly level: number;
  readonly cells: number;
  readonly quotaRemaining: number;
  readonly pressure: number;
  readonly chainStep: number;
  readonly chainTimer: number;
  readonly machinery: MachineryState | null;
  readonly cores: readonly CoreState[];
  readonly segments: readonly SegmentState[];
  readonly projectiles: readonly ProjectileState[];
  readonly loaded: ChargeId | null;
  readonly queued: ChargeId | null;
  readonly aim: number;
  readonly fireCooldown: number;
  readonly interlude: number;
  readonly simTime: number;
  readonly accumulator: number;
  readonly emission: boolean;
  readonly feed: boolean;
  readonly nextEmitted: ChargeId | null;
  readonly muted: boolean;
}

type TrainPose = readonly [number, ChargeId, MachineryKind | null][];
export interface VoluteSnapshot {
  readonly version: number;
  readonly screen: ScreenName;
  readonly score: number;
  readonly level: number;
  readonly cells: number;
  readonly quotaRemaining: number;
  readonly emitted: number;
  readonly pressure: number;
  readonly feedSpeed: number;
  readonly chainStep: number;
  readonly chainTimer: number;
  readonly interlude: number;
  readonly danger: boolean;
  readonly train: readonly {
    readonly s: number;
    readonly x: number;
    readonly y: number;
    readonly charge: ChargeId;
    readonly mark: MachineryKind | null;
    readonly segment: number;
  }[];
  readonly segments: readonly SegmentState[];
  readonly injector: {
    readonly aim: number;
    readonly cooldown: number;
    readonly loaded: ChargeId | null;
    readonly queued: ChargeId | null;
  };
  readonly projectiles: readonly ProjectileState[];
  readonly machinery: MachineryState | null;
  readonly emission: boolean;
  readonly feed: boolean;
  readonly nextEmitted: ChargeId | null;
  readonly muted: boolean;
  readonly simTime: number;
}

export interface VoluteDebugApi {
  readonly version: number;
  reset(state: DeepReadonly<VoluteState>): VoluteState;
  reconcile(state: DeepReadonly<VoluteState>): VoluteState;
  snapshot(state: DeepReadonly<VoluteState>): VoluteSnapshot;
  setScreen(state: DeepReadonly<VoluteState>, name: ScreenName): VoluteState;
  setLevel(state: DeepReadonly<VoluteState>, level: number): VoluteState;
  setScore(state: DeepReadonly<VoluteState>, n: number): VoluteState;
  setCells(state: DeepReadonly<VoluteState>, n: number): VoluteState;
  setChainStep(state: DeepReadonly<VoluteState>, k: number): VoluteState;
  startLevel(state: DeepReadonly<VoluteState>, level: number): VoluteState;
  poseTrain(state: DeepReadonly<VoluteState>, cores: TrainPose): VoluteState;
  clearTrain(state: DeepReadonly<VoluteState>): VoluteState;
  setLoaded(state: DeepReadonly<VoluteState>, charge: ChargeId): VoluteState;
  setQueued(state: DeepReadonly<VoluteState>, charge: ChargeId): VoluteState;
  setAim(state: DeepReadonly<VoluteState>, angleDegrees: number): VoluteState;
  fire(state: DeepReadonly<VoluteState>): VoluteState;
  setPressure(state: DeepReadonly<VoluteState>, value: number): VoluteState;
  setQuotaRemaining(state: DeepReadonly<VoluteState>, n: number): VoluteState;
  setEmission(state: DeepReadonly<VoluteState>, enabled: boolean): VoluteState;
  setNextEmitted(
    state: DeepReadonly<VoluteState>,
    charge: ChargeId | null,
  ): VoluteState;
  setFeed(state: DeepReadonly<VoluteState>, enabled: boolean): VoluteState;
  grantMachinery(
    state: DeepReadonly<VoluteState>,
    kind: Exclude<MachineryKind, "bore">,
  ): VoluteState;
  pause(state: DeepReadonly<VoluteState>): VoluteState;
  resume(state: DeepReadonly<VoluteState>): VoluteState;
}

export const BACKGROUND = "#090d12";
const pendingCues = new Set<string>();
const imagePaths = [
  "core-halide",
  "core-sulfur",
  "core-cobalt",
  "core-garnet",
  "core-olivine",
  "mark-choke",
  "mark-backflow",
  "mark-bore",
  "mark-sightline",
  "injector-base",
  "injector-barrel",
  "intake-maw",
  "channel-plate",
  "hud-cell",
  "hud-pressure",
] as const;
const sheetPaths = [
  ...Array.from({ length: 4 }, (_, i) => `recoil-${i}`),
  ...Array.from({ length: 6 }, (_, i) => `swallow-${i}`),
  ...Array.from({ length: 6 }, (_, i) => `flash-${i}`),
];
const images = new Map<string, ImageBitmap>();
const systems = new Map<string, ParticleSystem>();
interface VisualEffect {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  started: number;
  player?: ParticleCanvasPlayer;
}
let visualEffects: VisualEffect[] = [];

function own<T>(value: DeepReadonly<T>): T {
  return value as T;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function norm(a: number): number {
  return ((a % 360) + 360) % 360;
}
function assertInt(n: number, lo: number, hi = Infinity): void {
  if (!Number.isInteger(n) || n < lo || n > hi)
    throw new RangeError(`Volute: invalid integer ${n}`);
}
function assertCharge(c: unknown): asserts c is ChargeId {
  if (!CHARGE_IDS.includes(c as ChargeId))
    throw new RangeError(`Volute: invalid charge ${String(c)}`);
}
function pointAt(s: number): { x: number; y: number } {
  if (s <= 0) return { ...CHANNEL[0] };
  let walked = 0;
  for (let i = 0; i < CHANNEL.length - 1; i += 1) {
    const a = CHANNEL[i],
      b = CHANNEL[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (s < walked + len || i === CHANNEL.length - 2) {
      const t = clamp((s - walked) / len, 0, 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    walked += len;
  }
  return { ...CHANNEL[CHANNEL.length - 1] };
}
function forwardAt(s: number): { x: number; y: number } {
  let walked = 0;
  for (let i = 0; i < CHANNEL.length - 1; i += 1) {
    const a = CHANNEL[i],
      b = CHANNEL[i + 1],
      len = Math.hypot(b.x - a.x, b.y - a.y);
    if (s < walked + len || i === CHANNEL.length - 2)
      return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    walked += len;
  }
  return { x: -1, y: 0 };
}
function segmentOf(cores: readonly CoreState[], index: number): number {
  let seg = 0;
  for (let i = 1; i <= index; i += 1)
    if (Math.abs(cores[i - 1].s - cores[i].s - SPACING) > 1e-6) seg += 1;
  return seg;
}
function rebuildSegments(
  cores: readonly CoreState[],
  holds: readonly number[] = [],
): SegmentState[] {
  if (!cores.length) return [];
  const out: SegmentState[] = [];
  let count = 1,
    seg = 0;
  for (let i = 1; i < cores.length; i += 1) {
    if (Math.abs(cores[i - 1].s - cores[i].s - SPACING) < 1e-6) count += 1;
    else {
      out.push({ count, hold: holds[seg] ?? 0 });
      count = 1;
      seg += 1;
    }
  }
  out.push({ count, hold: holds[seg] ?? 0 });
  return out;
}
function levelData(level: number) {
  return LEVELS[level - 1];
}
function randomCharge(
  level: number,
  cores: readonly CoreState[] = [],
): ChargeId {
  const set = cores.length
    ? [...new Set(cores.map((c) => c.charge))]
    : [...levelData(level).charges];
  return set[Math.floor(Math.random() * set.length)]!;
}
function markForOrdinal(n: number): MachineryKind | null {
  return n % MARK_INTERVAL === 0
    ? MACHINERY_KINDS[(n / MARK_INTERVAL - 1) % MACHINERY_KINDS.length]
    : null;
}
function feedSpeed(s: DeepReadonly<VoluteState>): number {
  return (
    levelData(s.level).feedSpeed *
    (1 + s.pressure / PRESSURE_MAX) *
    (s.machinery?.kind === "choke" ? CHOKE_FEED_MULTIPLIER : 1)
  );
}
function danger(s: DeepReadonly<VoluteState>): boolean {
  return s.cores.length > 0 && s.cores[0].s >= DANGER_S;
}
function titleState(emission = true, feed = true, muted = false): VoluteState {
  return {
    screen: "title",
    score: 0,
    level: 1,
    cells: CELLS,
    quotaRemaining: LEVELS[0].quota,
    pressure: 0,
    chainStep: 1,
    chainTimer: 0,
    machinery: null,
    cores: [],
    segments: [],
    projectiles: [],
    loaded: null,
    queued: null,
    aim: AIM_START,
    fireCooldown: 0,
    interlude: 0,
    simTime: 0,
    accumulator: 0,
    emission,
    feed,
    nextEmitted: null,
    muted,
  };
}
function openLevel(
  state: DeepReadonly<VoluteState>,
  level: number,
): VoluteState {
  assertInt(level, 1, LEVEL_COUNT);
  const charges = levelData(level).charges;
  const cores = Array.from({ length: SEEDED_CORES }, (_, i): CoreState => ({
    charge: charges[Math.floor(Math.random() * charges.length)]!,
    s: SEEDED_HEAD_S - i * SPACING,
    mark: markForOrdinal(i + 1),
  }));
  return {
    ...own(state),
    screen: "playing",
    level,
    quotaRemaining: levelData(level).quota - SEEDED_CORES,
    pressure: 0,
    chainStep: 1,
    chainTimer: 0,
    machinery: null,
    cores,
    segments: [{ count: SEEDED_CORES, hold: 0 }],
    projectiles: [],
    loaded: randomCharge(level),
    queued: randomCharge(level),
    fireCooldown: 0,
    interlude: 0,
    accumulator: 0,
  };
}
function launch(state: DeepReadonly<VoluteState>): VoluteState {
  const loaded =
    state.loaded ??
    randomCharge(state.level, state.cores as readonly CoreState[]);
  return {
    ...own(state),
    projectiles: [
      ...state.projectiles,
      { charge: loaded, x: INJECTOR_X, y: INJECTOR_Y, angle: state.aim },
    ],
    loaded:
      state.queued ??
      randomCharge(state.level, state.cores as readonly CoreState[]),
    queued: randomCharge(state.level, state.cores as readonly CoreState[]),
    fireCooldown: FIRE_COOLDOWN,
  };
}

interface RemovalResult {
  state: VoluteState;
  marks: readonly { kind: MachineryKind; point: { x: number; y: number } }[];
}
function removeIndices(
  state: VoluteState,
  indices: readonly number[],
  scoreStep: number,
  extraction: boolean,
): RemovalResult {
  if (!indices.length) return { state, marks: [] };
  const set = new Set(indices);
  if (extraction)
    pendingCues.add(EXTRACT_CUES[Math.min(scoreStep, EXTRACT_CUES.length) - 1]);
  const first = Math.min(...indices);
  const marks = indices.flatMap((i) =>
    state.cores[i].mark
      ? [{ kind: state.cores[i].mark!, point: pointAt(state.cores[i].s) }]
      : [],
  );
  if (extraction)
    for (const index of indices) {
      const point = pointAt(state.cores[index].s);
      visualEffects.push({ name: "extraction-burst", ...point, started: -1 });
    }
  let cores = state.cores.filter((_, i) => !set.has(i)).map((c) => ({ ...c }));
  const frontS = state.cores[first].s;
  const frontCount = cores.findIndex((c) => c.s < frontS);
  const start = frontCount < 0 ? cores.length : frontCount;
  let i = start;
  while (i < cores.length) {
    let end = i;
    while (
      end + 1 < cores.length &&
      Math.abs(cores[end].s - cores[end + 1].s - SPACING) < 1e-6
    )
      end += 1;
    const tail = cores[end];
    const behind = cores[end + 1];
    const room = Math.min(
      tail.s,
      behind ? tail.s - behind.s - SPACING : RECOIL,
    );
    const moved = clamp(room, 0, RECOIL);
    cores = cores.map((c, j) =>
      j >= i && j <= end ? { ...c, s: c.s - moved } : c,
    );
    i = end + 1;
  }
  const segments = rebuildSegments(cores).map((seg, si) =>
    si >= segmentOf(cores, Math.min(start, Math.max(0, cores.length - 1)))
      ? { ...seg, hold: RECOIL_HOLD }
      : seg,
  );
  return {
    state: {
      ...state,
      cores,
      segments,
      score: state.score + SCORE_PER_CORE * indices.length * scoreStep,
      pressure: clamp(
        state.pressure - PRESSURE_DROP_PER_CORE * indices.length,
        PRESSURE_MIN,
        PRESSURE_MAX,
      ),
      chainStep: extraction ? scoreStep : state.chainStep,
      chainTimer: extraction ? CHAIN_RESET : state.chainTimer,
    },
    marks,
  };
}
function extractRun(
  state: VoluteState,
  index: number,
  step: number,
): RemovalResult | null {
  let a = index,
    b = index;
  while (
    a > 0 &&
    state.cores[a - 1].charge === state.cores[index].charge &&
    segmentOf(state.cores, a - 1) === segmentOf(state.cores, index)
  )
    a -= 1;
  while (
    b + 1 < state.cores.length &&
    state.cores[b + 1].charge === state.cores[index].charge &&
    segmentOf(state.cores, b + 1) === segmentOf(state.cores, index)
  )
    b += 1;
  if (b - a + 1 < MIN_RUN) return null;
  return removeIndices(
    state,
    Array.from({ length: b - a + 1 }, (_, i) => a + i),
    step,
    true,
  );
}
function grantMarks(result: RemovalResult): VoluteState {
  let s = result.state;
  for (const m of result.marks) {
    pendingCues.add(CUES.machinery);
    if (m.kind === "bore") {
      visualEffects.push({ name: "bore-detonation", ...m.point, started: -1 });
      const hit = s.cores
        .map((c, i) => ({ i, p: pointAt(c.s) }))
        .filter(
          (v) =>
            Math.hypot(v.p.x - m.point.x, v.p.y - m.point.y) <= BORE_RADIUS,
        )
        .map((v) => v.i);
      s = removeIndices(s, hit, s.chainStep, false).state;
    } else {
      visualEffects.push({ name: "pickup-shimmer", ...m.point, started: -1 });
      s = {
        ...s,
        machinery: { kind: m.kind, remaining: MACHINERY_DURATIONS[m.kind] },
      };
    }
  }
  return s;
}

function advanceTrain(state: VoluteState): VoluteState {
  if (!state.feed || !state.cores.length) return state;
  if (state.machinery?.kind === "backflow") {
    const cores = [...state.cores]
      .reverse()
      .map((c, ri, rev) => {
        const behind = ri ? rev[ri - 1] : null;
        return {
          ...c,
          s:
            c.s < 0
              ? c.s
              : Math.max(
                  behind ? behind.s + SPACING : 0,
                  c.s - BACKFLOW_SPEED * TICK_DT,
                ),
        };
      })
      .reverse();
    return {
      ...state,
      cores,
      segments: rebuildSegments(
        cores,
        state.segments.map((s) => s.hold),
      ),
    };
  }
  const cores = state.cores.map((c) => ({ ...c }));
  let offset = 0;
  const oldSegments = state.segments.map((s) => ({ ...s }));
  const joins: number[] = [];
  for (let si = 0; si < oldSegments.length; si += 1) {
    const seg = oldSegments[si];
    const rate = si === 0 ? feedSpeed(state) : CATCHUP_SPEED;
    const move = seg.hold > 0 ? 0 : rate * TICK_DT;
    const limit =
      si === 0 ? Infinity : cores[offset - 1].s - SPACING - cores[offset].s;
    const actual = Math.min(move, Math.max(0, limit));
    if (si > 0 && Number.isFinite(limit) && move >= Math.max(0, limit))
      joins.push(offset);
    for (let j = offset; j < offset + seg.count; j += 1)
      cores[j] = { ...cores[j], s: cores[j].s + actual };
    offset += seg.count;
  }
  let s: VoluteState = {
    ...state,
    cores,
    segments: rebuildSegments(
      cores,
      oldSegments.map((x) => x.hold),
    ),
  };
  for (const i of joins) {
    if (i >= s.cores.length) continue;
    if (
      Math.abs(s.cores[i - 1].s - s.cores[i].s - SPACING) < 1e-6 &&
      s.cores[i - 1].charge === s.cores[i].charge
    ) {
      const ex = extractRun(s, i, s.chainStep + 1);
      if (ex) s = grantMarks(ex);
    }
  }
  return s;
}
function insertProjectile(
  state: VoluteState,
  p: ProjectileState,
  hit: number,
): VoluteState {
  const c = state.cores[hit],
    cp = pointAt(c.s),
    f = forwardAt(c.s);
  const ahead = (p.x - cp.x) * f.x + (p.y - cp.y) * f.y > 0;
  const at = ahead ? c.s : c.s - SPACING;
  const core: CoreState = { charge: p.charge, s: at, mark: null };
  const shifted = state.cores.map((x) =>
    x.s <= at ? { ...x, s: x.s - SPACING } : { ...x },
  );
  const index = ahead ? hit : hit + 1;
  const cores = [...shifted.slice(0, index), core, ...shifted.slice(index)];
  let s: VoluteState = { ...state, cores, segments: rebuildSegments(cores) };
  const ex = extractRun(s, index, 1);
  if (ex) s = grantMarks(ex);
  return s;
}
function advanceProjectiles(state: VoluteState, api: UpdateApi): VoluteState {
  let s = state;
  const survivors: ProjectileState[] = [];
  let seated = false;
  for (const old of state.projectiles) {
    const r = (old.angle * Math.PI) / 180,
      p = {
        ...old,
        x: old.x + Math.cos(r) * PROJECTILE_SPEED * TICK_DT,
        y: old.y + Math.sin(r) * PROJECTILE_SPEED * TICK_DT,
      };
    let best = -1,
      dist = Infinity;
    s.cores.forEach((c, i) => {
      const q = pointAt(c.s),
        d = Math.hypot(p.x - q.x, p.y - q.y);
      if (
        d <= CORE_RADIUS * 2 &&
        (d < dist - 1e-9 ||
          (Math.abs(d - dist) < 1e-9 && c.s > (s.cores[best]?.s ?? -Infinity)))
      ) {
        best = i;
        dist = d;
      }
    });
    if (best >= 0) {
      s = insertProjectile(s, p, best);
      seated = true;
    } else if (p.x >= 0 && p.x <= FIELD_W && p.y >= 0 && p.y <= FIELD_H)
      survivors.push(p);
  }
  if (seated) api.audio.play(CUES.seat);
  return { ...s, projectiles: survivors };
}
function tick(input: VoluteState, api: UpdateApi): VoluteState {
  let s: VoluteState = {
    ...input,
    fireCooldown: Math.max(0, input.fireCooldown - TICK_DT),
    chainTimer: Math.max(0, input.chainTimer - TICK_DT),
    machinery: input.machinery
      ? {
          ...input.machinery,
          remaining: Math.max(0, input.machinery.remaining - TICK_DT),
        }
      : null,
    segments: input.segments.map((x) => ({
      ...x,
      hold: Math.max(0, x.hold - TICK_DT),
    })),
  };
  if (s.chainTimer <= 0) s = { ...s, chainStep: 1, chainTimer: 0 };
  if (s.machinery && s.machinery.remaining <= 0) s = { ...s, machinery: null };
  s = advanceTrain(s);
  s = advanceProjectiles(s, api);
  const rise =
      Math.max(0, s.cores.length - PRESSURE_FREE) * PRESSURE_RISE_PER_CORE,
    bleed = s.cores.length <= PRESSURE_FREE ? PRESSURE_BLEED : 0;
  s = {
    ...s,
    pressure: clamp(
      s.pressure + (rise - bleed) * TICK_DT,
      PRESSURE_MIN,
      PRESSURE_MAX,
    ),
  };
  if (s.cores[0]?.s >= PATH_LENGTH) {
    visualEffects.push({
      name: "intake-spray",
      ...pointAt(PATH_LENGTH),
      started: -1,
    });
    api.audio.play(CUES.intake);
    api.audio.play(CUES.cellLost);
    const cells = s.cells - 1;
    if (cells <= 0)
      s = {
        ...s,
        screen: "gameover",
        cells: 0,
        cores: [],
        segments: [],
        projectiles: [],
        pressure: 0,
        machinery: null,
        chainStep: 1,
        chainTimer: 0,
        loaded: null,
        queued: null,
        accumulator: 0,
      };
    else
      s = {
        ...s,
        screen: "setback",
        cells,
        cores: [],
        segments: [],
        projectiles: [],
        pressure: 0,
        machinery: null,
        chainStep: 1,
        chainTimer: 0,
        quotaRemaining: levelData(s.level).quota - SEEDED_CORES,
        interlude: INTERLUDE,
        accumulator: 0,
      };
    return s;
  }
  if (s.quotaRemaining === 0 && s.cores.length === 0) {
    api.audio.play(CUES.levelClear);
    s = {
      ...s,
      score: s.score + CLEAR_SCORE,
      screen: s.level === LEVEL_COUNT ? "victory" : "cleared",
      interlude: s.level === LEVEL_COUNT ? 0 : INTERLUDE,
      accumulator: 0,
    };
    return s;
  }
  if (
    s.emission &&
    s.machinery?.kind !== "backflow" &&
    s.quotaRemaining > 0 &&
    (s.cores.length === 0 || s.cores[s.cores.length - 1].s >= SPACING)
  ) {
    const ordinal = levelData(s.level).quota - s.quotaRemaining + 1;
    const core: { charge: ChargeId; s: number; mark: MachineryKind | null } = {
      charge: s.nextEmitted ?? randomCharge(s.level, s.cores),
      s: 0,
      mark: markForOrdinal(ordinal),
    };
    const cores = [...s.cores, core];
    s = {
      ...s,
      cores,
      segments: rebuildSegments(cores),
      quotaRemaining: s.quotaRemaining - 1,
      nextEmitted: null,
    };
  }
  return s;
}

function snapshot(s: DeepReadonly<VoluteState>): VoluteSnapshot {
  return {
    version: VOLUTE_DEBUG_VERSION,
    screen: s.screen,
    score: s.score,
    level: s.level,
    cells: s.cells,
    quotaRemaining: s.quotaRemaining,
    emitted: levelData(s.level).quota - s.quotaRemaining,
    pressure: s.pressure,
    feedSpeed: feedSpeed(s),
    chainStep: s.chainStep,
    chainTimer: s.chainTimer,
    interlude: s.interlude,
    danger: danger(s),
    train: s.cores.map((c, i) => ({
      ...c,
      ...pointAt(c.s),
      segment: segmentOf(s.cores as readonly CoreState[], i),
    })),
    segments: s.segments.map((x) => ({ ...x })),
    injector: {
      aim: s.aim,
      cooldown: s.fireCooldown,
      loaded: s.loaded,
      queued: s.queued,
    },
    projectiles: s.projectiles.map((x) => ({ ...x })),
    machinery: s.machinery ? { ...s.machinery } : null,
    emission: s.emission,
    feed: s.feed,
    nextEmitted: s.nextEmitted,
    muted: s.muted,
    simTime: s.simTime,
  };
}
function debugApi(): VoluteDebugApi {
  const validateLevel = (n: number) => assertInt(n, 1, LEVEL_COUNT),
    validateScreen = (n: ScreenName) => {
      if (
        !(
          [
            "title",
            "playing",
            "paused",
            "cleared",
            "setback",
            "gameover",
            "victory",
          ] as const
        ).includes(n)
      )
        throw new RangeError(`Volute: invalid screen ${String(n)}`);
    };
  return {
    version: VOLUTE_DEBUG_VERSION,
    reset: (s) => titleState(s.emission, s.feed, s.muted),
    reconcile: (s) => ({
      ...own(s),
      segments: rebuildSegments(
        s.cores as readonly CoreState[],
        s.segments.map((x) => x.hold),
      ),
    }),
    snapshot,
    setScreen: (s, n) => {
      validateScreen(n);
      return { ...own(s), screen: n };
    },
    setLevel: (s, n) => {
      validateLevel(n);
      return { ...own(s), level: n };
    },
    setScore: (s, n) => {
      assertInt(n, 0);
      return { ...own(s), score: n };
    },
    setCells: (s, n) => {
      assertInt(n, 0, CELLS);
      return { ...own(s), cells: n };
    },
    setChainStep: (s, n) => {
      assertInt(n, 1);
      return { ...own(s), chainStep: n, chainTimer: CHAIN_RESET };
    },
    startLevel: (s, n) => openLevel(s, n),
    poseTrain: (s, list) => {
      const cores = list
        .map(([arc, charge, mark], i) => {
          if (typeof arc !== "number" || arc > PATH_LENGTH)
            throw new RangeError("Volute: invalid arc position");
          assertCharge(charge);
          if (mark !== null && !MACHINERY_KINDS.includes(mark))
            throw new RangeError("Volute: invalid mark");
          return { charge, s: arc, mark, i };
        })
        .sort((a, b) => b.s - a.s || a.i - b.i)
        .map(({ i: _, ...c }) => c);
      return { ...own(s), cores, segments: rebuildSegments(cores) };
    },
    clearTrain: (s) => ({
      ...own(s),
      cores: [],
      segments: [],
      projectiles: [],
    }),
    setLoaded: (s, c) => {
      assertCharge(c);
      return { ...own(s), loaded: c };
    },
    setQueued: (s, c) => {
      assertCharge(c);
      return { ...own(s), queued: c };
    },
    setAim: (s, a) => {
      if (!Number.isFinite(a)) throw new RangeError("Volute: invalid aim");
      return { ...own(s), aim: norm(a) };
    },
    fire: (s) => launch({ ...own(s), fireCooldown: 0 }),
    setPressure: (s, n) => {
      if (typeof n !== "number" || n < PRESSURE_MIN || n > PRESSURE_MAX)
        throw new RangeError("Volute: invalid pressure");
      return { ...own(s), pressure: n };
    },
    setQuotaRemaining: (s, n) => {
      assertInt(n, 0);
      return { ...own(s), quotaRemaining: n };
    },
    setEmission: (s, v) => {
      if (typeof v !== "boolean")
        throw new TypeError("Volute: invalid emission gate");
      return { ...own(s), emission: v };
    },
    setNextEmitted: (s, c) => {
      if (c !== null) assertCharge(c);
      return { ...own(s), nextEmitted: c };
    },
    setFeed: (s, v) => {
      if (typeof v !== "boolean")
        throw new TypeError("Volute: invalid feed gate");
      return { ...own(s), feed: v };
    },
    grantMachinery: (s, k) => {
      if ((k as MachineryKind) === "bore" || !MACHINERY_KINDS.includes(k))
        throw new RangeError("Volute: invalid timed machinery");
      return {
        ...own(s),
        machinery: { kind: k, remaining: MACHINERY_DURATIONS[k] },
      };
    },
    pause: (s) => ({ ...own(s), screen: "paused" }),
    resume: (s) => ({ ...own(s), screen: "playing" }),
  };
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w?: number,
  h?: number,
): void {
  const img = images.get(name);
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      img,
      Math.round(x - (w ?? img.width) / 2),
      Math.round(y - (h ?? img.height) / 2),
      w ?? img.width,
      h ?? img.height,
    );
  }
}
function drawHall(s: DeepReadonly<VoluteState>, api: RenderApi): void {
  const c = api.ctx;
  c.fillStyle = "#0d151b";
  c.fillRect(0, 0, FIELD_W, FIELD_H);
  c.strokeStyle = "#17252b";
  c.lineWidth = 1;
  for (let x = 0; x < FIELD_W; x += 32) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, FIELD_H);
    c.stroke();
  }
  for (let y = 0; y < FIELD_H; y += 32) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(FIELD_W, y);
    c.stroke();
  }
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = "#263b42";
  c.lineWidth = 48;
  c.beginPath();
  CHANNEL.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.stroke();
  c.setLineDash([5, 7]);
  c.strokeStyle = "#52646a";
  c.lineWidth = 2;
  c.stroke();
  c.setLineDash([]);
  for (let arc = 0; arc < PATH_LENGTH; arc += 56) {
    const p = pointAt(arc);
    drawImage(c, "channel-plate", p.x, p.y, 46, 46);
  }
  const swallowing = s.screen === "setback" && s.interlude > INTERLUDE - 0.45;
  const swallowFrame = Math.min(
    5,
    Math.floor(((INTERLUDE - s.interlude) / 0.45) * 6),
  );
  drawImage(
    c,
    swallowing ? `swallow-${Math.max(0, swallowFrame)}` : "intake-maw",
    480,
    320,
  );
  c.fillStyle = "#80e0d0";
  c.font = "bold 11px monospace";
  c.fillText("INLET", 18, 78);
  c.fillStyle = "#ff6b57";
  c.fillText("INTAKE", 452, 365);
  if (s.machinery?.kind === "sightline") {
    const r = (s.aim * Math.PI) / 180;
    c.strokeStyle = "rgba(126,255,231,.65)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(INJECTOR_X, INJECTOR_Y);
    c.lineTo(INJECTOR_X + Math.cos(r) * 700, INJECTOR_Y + Math.sin(r) * 700);
    c.stroke();
  }
  s.cores.forEach((core) => {
    const p = pointAt(core.s);
    drawImage(c, `core-${core.charge}`, p.x, p.y);
    if (core.mark) drawImage(c, `mark-${core.mark}`, p.x, p.y);
  });
  s.projectiles.forEach((p) => drawImage(c, `core-${p.charge}`, p.x, p.y));
  drawImage(c, "injector-base", INJECTOR_X, INJECTOR_Y);
  c.save();
  c.translate(INJECTOR_X, INJECTOR_Y);
  c.rotate((s.aim * Math.PI) / 180);
  const recoilFrame =
    s.fireCooldown > 0
      ? Math.min(3, Math.floor((1 - s.fireCooldown / FIRE_COOLDOWN) * 4))
      : -1;
  drawImage(
    c,
    recoilFrame >= 0 ? `recoil-${recoilFrame}` : "injector-barrel",
    20,
    0,
  );
  c.restore();
  if (s.loaded) drawImage(c, `core-${s.loaded}`, INJECTOR_X, INJECTOR_Y);
}
function panel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  c.fillStyle = "rgba(4,9,12,.88)";
  c.fillRect(x, y, w, h);
  c.strokeStyle = "#4e6c70";
  c.lineWidth = 2;
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function drawHud(
  s: DeepReadonly<VoluteState>,
  c: CanvasRenderingContext2D,
): void {
  panel(c, 12, 452, 936, 76);
  c.fillStyle = "#d5e6df";
  c.font = "bold 16px monospace";
  c.fillText(
    `SCORE ${String(s.score).padStart(6, "0")}   LEVEL ${s.level}`,
    30,
    480,
  );
  c.font = "12px monospace";
  c.fillStyle = "#80969a";
  c.fillText("CELLS", 30, 505);
  for (let i = 0; i < s.cells; i += 1)
    drawImage(c, "hud-cell", 88 + i * 27, 500);
  drawImage(c, "hud-pressure", 205, 497);
  c.fillStyle = "#17292e";
  c.fillRect(224, 489, 180, 15);
  c.fillStyle = s.pressure > 70 ? "#ff695d" : "#56d5bd";
  c.fillRect(226, 491, (176 * s.pressure) / 100, 11);
  c.strokeStyle = "#6c8688";
  c.strokeRect(224, 489, 180, 15);
  c.fillStyle = "#80969a";
  c.fillText(`PRESSURE ${Math.round(s.pressure)}%`, 224, 519);
  c.fillText("LOADED", 465, 478);
  c.fillText("NEXT", 552, 478);
  if (s.loaded) drawImage(c, `core-${s.loaded}`, 493, 504);
  if (s.queued) drawImage(c, `core-${s.queued}`, 574, 504);
  c.fillStyle = "#d5e6df";
  c.fillText(`CHAIN x${s.chainStep}`, 650, 480);
  c.fillText(
    s.machinery
      ? `${s.machinery.kind.toUpperCase()} ${s.machinery.remaining.toFixed(1)}s`
      : "MACHINERY —",
    650,
    505,
  );
}
function overlay(
  c: CanvasRenderingContext2D,
  title: string,
  lines: readonly string[],
  accent: "#68f5e2" | "#ff557d" = "#68f5e2",
): void {
  c.fillStyle = "rgba(3,7,10,.78)";
  c.fillRect(0, 0, FIELD_W, FIELD_H);
  panel(c, 230, 125, 500, 285);
  c.textAlign = "center";
  c.fillStyle = accent;
  c.font = "bold 54px monospace";
  c.fillText(title, 480, 205);
  c.fillStyle = "#d8e5df";
  c.font = "18px monospace";
  lines.forEach((line, i) => c.fillText(line, 480, 254 + i * 30));
  c.textAlign = "start";
}
function render(s: DeepReadonly<VoluteState>, api: RenderApi): void {
  drawHall(s, api);
  const c = api.ctx;
  visualEffects = visualEffects.filter((effect) => {
    if (effect.started < 0) effect.started = s.simTime;
    const age = s.simTime - effect.started;
    if (age > 1.15) {
      effect.player?.dispose();
      return false;
    }
    if (effect.name === "extraction-burst") {
      const frame = Math.min(5, Math.floor((age / 0.35) * 6));
      drawImage(c, `flash-${frame}`, effect.x, effect.y);
    }
    const system = systems.get(effect.name);
    if (system) {
      effect.player ??= new ParticleCanvasPlayer(system, c, {
        clear: false,
        composite: effect.name === "intake-spray" ? "source-over" : "lighter",
        pixelRadius: 2.4,
      });
      c.save();
      c.translate(effect.x - FIELD_W / 2, effect.y - FIELD_H / 2);
      effect.player.update(Math.max(0, api.frame().lastDeltaMs / 1000));
      c.restore();
    }
    return true;
  });
  if (["playing", "paused", "cleared", "setback"].includes(s.screen))
    drawHud(s, c);
  if (danger(s) && s.screen === "playing") {
    c.fillStyle = "rgba(255,50,45,.1)";
    c.fillRect(0, 0, FIELD_W, FIELD_H);
    c.textAlign = "center";
    c.fillStyle = "#ff675d";
    c.font = "bold 20px monospace";
    c.fillText("⚠ INTAKE PRESSURE — EXTRACT NOW ⚠", 480, 28);
    c.textAlign = "start";
  }
  if (s.screen === "title")
    overlay(c, TITLE_TEXT, [
      "A GEOTHERMAL EXTRACTION HALL",
      "ENTER / SPACE / TAP TO BEGIN",
      "A / D or ← / →  AIM     SPACE / TAP  FIRE",
      "X  SWAP     P / ESC  PAUSE     M  MUTE",
    ]);
  if (s.screen === "paused")
    overlay(c, "PAUSED", ["THE HALL IS HOLDING", "P / ESC TO RESUME"]);
  if (s.screen === "cleared")
    overlay(c, `LEVEL ${s.level} CLEAR`, [
      `SCORE ${s.score}`,
      "PRESSURE PURGED — NEXT STAGE INCOMING",
    ]);
  if (s.screen === "setback")
    overlay(
      c,
      "CELL LOST",
      [
        `${s.cells} CELL${s.cells === 1 ? "" : "S"} REMAIN`,
        `LEVEL ${s.level} RESTARTING`,
      ],
      "#ff557d",
    );
  if (s.screen === "gameover")
    overlay(
      c,
      "HALL OFFLINE",
      [
        `FINAL SCORE ${s.score}`,
        `REACHED LEVEL ${s.level}`,
        "ENTER / SPACE / TAP TO RETURN",
      ],
      "#ff557d",
    );
  if (s.screen === "victory")
    overlay(c, "HALL CLEARED", [
      `FINAL SCORE ${s.score}`,
      "ALL FIVE LEVELS STABLE",
      "ENTER / SPACE / TAP TO RETURN",
    ]);
}

export const game: Game<VoluteState, VoluteDebugApi> = {
  async initialize(api) {
    for (const action of ACTIONS)
      api.input.register(action, { keys: [...BINDINGS[action]] });
    await Promise.all(
      [...imagePaths, ...sheetPaths].map(async (n) =>
        images.set(n, await api.assets.loadImage(`sprites/${n}.png`)),
      ),
    );
    await Promise.all(
      Object.values(CUES).map((c) => api.audio.load(c, `audio/${c}.wav`)),
    );
    await Promise.all(
      [
        "extraction-burst",
        "bore-detonation",
        "intake-spray",
        "pickup-shimmer",
      ].map(async (n) => {
        const blob = await api.assets.load(`particles/${n}.system.json`);
        systems.set(n, JSON.parse(await blob.text()) as ParticleSystem);
      }),
    );
    const regs: [
      string,
      (s: DeepReadonly<VoluteState>) => string | number | boolean,
    ][] = [
      ["screen", (s) => s.screen],
      ["level / score", (s) => `${s.level} / ${s.score}`],
      ["cells", (s) => s.cells],
      ["quota", (s) => s.quotaRemaining],
      [
        "pressure / feed",
        (s) => `${s.pressure.toFixed(1)} / ${feedSpeed(s).toFixed(1)}`,
      ],
      ["chain", (s) => s.chainStep],
      [
        "cores / head",
        (s) => `${s.cores.length} / ${s.cores[0]?.s.toFixed(1) ?? "—"}`,
      ],
      ["segments", (s) => s.segments.length],
      ["danger", danger],
      [
        "load / queue / aim",
        (s) =>
          `${s.loaded ?? "—"} / ${s.queued ?? "—"} / ${s.aim.toFixed(1)} / ${s.fireCooldown.toFixed(2)}`,
      ],
      ["projectiles", (s) => s.projectiles.length],
      [
        "machinery",
        (s) =>
          s.machinery
            ? `${s.machinery.kind} ${s.machinery.remaining.toFixed(1)}`
            : "—",
      ],
    ];
    regs.forEach(([n, f]) => api.diagnostics.register(n, f));
    return [titleState(), debugApi()];
  },
  update(state, api, dt) {
    pendingCues.clear();
    let s: { -readonly [K in keyof VoluteState]: VoluteState[K] } = {
      ...own(state),
      simTime: state.simTime + dt,
      muted: api.audio.muted(),
    };
    if (api.input.pressed("mute")) {
      api.audio.setMuted(!api.audio.muted());
      s = { ...s, muted: api.audio.muted() };
    }
    const ptr = api.input.pointer(),
      pointerMoved = api.input
        .pointerSamples()
        .some((sample) => sample.primary),
      inside = ptr.x >= 0 && ptr.x <= FIELD_W && ptr.y >= 0 && ptr.y <= FIELD_H,
      pointerPress = inside && api.input.pointerPressed();
    if (s.screen === "title" && (api.input.pressed("confirm") || pointerPress))
      s = openLevel({ ...s, cells: CELLS, score: 0 }, 1);
    else if (
      (s.screen === "gameover" || s.screen === "victory") &&
      (api.input.pressed("confirm") || pointerPress)
    )
      s = titleState(s.emission, s.feed, s.muted);
    else if (s.screen === "paused" && api.input.pressed("pause"))
      s = { ...s, screen: "playing" };
    else if (s.screen === "playing") {
      if (api.input.pressed("pause"))
        s = { ...s, screen: "paused", accumulator: 0 };
      else {
        if (
          pointerMoved &&
          inside &&
          (ptr.x !== INJECTOR_X || ptr.y !== INJECTOR_Y)
        )
          s = {
            ...s,
            aim: norm(
              (Math.atan2(ptr.y - INJECTOR_Y, ptr.x - INJECTOR_X) * 180) /
                Math.PI,
            ),
          };
        s = {
          ...s,
          aim: norm(
            s.aim +
              (api.input.value("right") - api.input.value("left")) *
                AIM_TURN_RATE *
                dt,
          ),
        };
        if (api.input.pressed("b") && s.loaded && s.queued) {
          [s.loaded, s.queued] = [s.queued, s.loaded];
          api.audio.play(CUES.swap);
        }
        const fire = api.input.pressed("a") || pointerPress;
        if (fire) {
          if (s.fireCooldown > 0) api.audio.play(CUES.denied);
          else if (s.loaded) {
            s = launch(s);
            api.audio.play(CUES.fire);
          }
        }
        let acc = s.accumulator + dt;
        while (acc + 1e-10 >= TICK_DT && s.screen === "playing") {
          s = tick({ ...s, accumulator: acc }, api);
          acc -= TICK_DT;
        }
        s = {
          ...s,
          accumulator: s.screen === "playing" ? Math.max(0, acc) : 0,
        };
      }
    } else if (s.screen === "cleared" || s.screen === "setback") {
      const interlude = Math.max(0, s.interlude - dt);
      s = { ...s, interlude };
      if (interlude <= 0)
        s = openLevel(s, s.screen === "cleared" ? s.level + 1 : s.level);
    }
    const desired =
      s.screen === "playing"
        ? danger(s)
          ? CUES.dangerLoop
          : CUES.hallLoop
        : null;
    for (const cue of [CUES.hallLoop, CUES.dangerLoop]) {
      if (cue === desired) {
        if (!api.audio.looping(cue)) api.audio.loop(cue);
      } else api.audio.stop(cue);
    }
    pendingCues.forEach((cue) => api.audio.play(cue));
    return s;
  },
  render,
};

// Retain the runtime binding in the production bundle; live systems are authored assets.
void ParticleCanvasPlayer;
