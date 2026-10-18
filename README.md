# Volute

Volute is a browser arcade-puzzle game set inside a worn geothermal pump hall.
Aim the central injector, fire mineral cores into the moving channel, and create
groups of three or more matching charges before the train reaches the intake.
Chained reactions score more, while marked cores unlock choke, backflow, bore,
and sightline machinery.

The TypeScript game uses the Simple 2D engine and ships original pixel-art
sprites and animation, live particle systems, synthesized and sampled effects,
and two sequenced music beds. Everything is self-contained.

## Setup and development

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Production build

```sh
npm run build
```

The static site is emitted to `dist/` and works from a web root or sub-path.
Useful checks are `npm test`, `npm run typecheck`, `npm run lint`, and
`npm run format`.

## Controls

- Aim: mouse/touch pointer, `A`/`D`, or left/right arrows
- Fire: click/tap or `Space`
- Swap loaded and queued cores: `X`
- Pause/resume: `P` or `Escape`
- Mute/unmute: `M`
- Start or dismiss an ending: `Enter`, `Space`, click, or tap
- Toggle diagnostics: backtick
