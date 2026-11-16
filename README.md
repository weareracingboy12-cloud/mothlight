# Mothlight

[![make.fun · best-game-01](https://make.fun/bounty/best-game-01)](https://make.fun/bounty/best-game-01)

A lantern moth against the dark. Survive 10 waves of shadow wisps, choose a
blessing between waves, and beat the Gloomwarden — the boss of waves 5 and 10 —
to bring the dawn back.

## How to play

- **Move:** WASD / arrow keys
- **Aim:** mouse (or leave the mouse alone and the moth aims at the nearest wisp)
- **Fire:** automatic — the game is about moving, aiming and dashing
- **Dash:** Space (brief invulnerability, 2.4 s recharge)
- **Pause:** P · **Mute:** M · **Restart:** Space or click

## What's in the game

- 10 waves: wisps that chase, spitters that shoot, brutes that soak damage,
  and the Gloomwarden boss with radial bursts and wisp summons
- A blessing draft after every cleared wave — 10 upgrades (damage, fire rate,
  twin flames, piercing light, magnet, dash, max HP…)
- Embers (score) and hearts (healing) dropped by fallen wisps, pulled in by
  your magnet
- Particles, screen shake, hit flashes, floating score text, synthesised
  WebAudio effects and a soft lantern motif — all made in code, no audio or
  image files, so the game plays fully offline from static files
- Title, pause, upgrade, game-over and victory screens; best score kept in
  `localStorage`

## Play it

```sh
node serve.ts   # then open http://localhost:8080
```

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code, staged deterministically with `?shot=title|play|boss|win&seed=1` (see
`shots.json` and `game/src/shots.js`).

## Layout

- `game/src/config.js` — tuning numbers, palette, upgrades
- `game/src/world.js` — rules: waves, enemies, boss, pickups, upgrades
- `game/src/render.js` — drawing only: field, HUD and screens
- `game/src/particles.js` — particles, floating text, screen shake
- `game/src/audio.js` — synthesised WebAudio effects and motif
- `game/src/input.js` — keyboard and pointer input
- `game/src/shots.js` — deterministic screenshot scenes (autopilot)
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)

## License

MIT — see `LICENSE`.
