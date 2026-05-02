# Umbral Duel

Umbral Duel is a gothic 2D combat prototype focused on tight one-versus-one duels. The current build is a local player-versus-bot vertical slice with sword attacks, block, parry, posture damage, roll invulnerability, round reset, and debug hitboxes.

## Current Features

- Gothic pixel-art inspired fighter prototype.
- Player versus bot duel mode.
- Light attack with startup, active, and recovery timing.
- Block that heavily reduces life damage while draining posture.
- Perfect block/parry window that damages attacker posture.
- Roll with short invulnerability.
- Posture break stun.
- Round win text, score, and automatic reset.
- Debug hitbox view with `H`.

## Controls

- `A` / `D`: move
- `Space`: jump
- `Shift`: roll
- Left mouse button: attack
- Right mouse button: block/parry
- `R`: reset round
- `H`: toggle hitboxes

## Prototype Debugging

- Press `H` to toggle hitboxes.
- The red rectangle is the active sword hitbox.
- The blue rectangles are fighter hurtboxes.
- Debug text shows fighter states, posture, life, and current bot intent.

The current combat tuning is intentionally visible and testable. Before adding multiplayer, use the bot duel to evaluate parry timing, posture pressure, roll invulnerability, hitstun, attack recovery, and bot pacing.

## Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Tech Stack

- TypeScript
- Phaser 3
- Vite
- Vitest

## Project Status

This is an early combat prototype. The long-term direction is online 1v1 PvP, but the current focus is making the core duel feel good against a bot before adding menus, lobbies, matchmaking, accounts, or multiplayer networking.
