# Sparring Bot Duel Design

## Goal

Add a playable one-versus-bot duel mode that uses the same gothic swordsman kit for the player and the bot. The goal is to test timing, spacing, hitboxes, block, parry, posture pressure, roll, punish windows, and round flow in a more realistic fight than the current training dummy.

## Why This Comes Next

The final game is intended to become a 1v1 PvP game. Before online multiplayer, the project needs a combat architecture where a fighter can be controlled by different input sources. A competent sparring bot gives a useful test opponent while preserving the future multiplayer shape: local input, bot input, and later remote input should all feed the same fighter action interface.

## Scope

In scope:

- Replace the passive dummy with a bot-controlled fighter using the same player sprite sheet and combat rules.
- Introduce reusable `FighterEntity` structure for player and bot.
- Introduce controller interfaces for player input and bot decisions.
- Replace simple distance-based hits with active-frame hitboxes and hurtboxes.
- Add a smarter sparring bot with spacing, delayed reactions, block, parry attempts, roll/retreat, and punish behavior.
- Add basic round reset and win/loss feedback.
- Keep debug visibility for current state, posture, and bot intent.

Out of scope:

- Online multiplayer.
- Login, accounts, matchmaking, lobby codes, or menus.
- Full character select.
- Advanced animation blending.
- Multiple weapons or builds.

## Bot Behavior

The bot should feel like a duel opponent, not a walking dummy. It should still be beatable and imperfect.

Core behaviors:

- **Spacing:** tries to stay near optimal sword range instead of constantly hugging the player.
- **Approach:** walks toward the player when outside threat range.
- **Retreat:** backs up or rolls away when its posture is low or it is too close after pressure.
- **Attack timing:** uses short randomized decision delays, so attacks do not happen instantly every time range is reached.
- **Block:** blocks when the player is pressuring or close.
- **Parry attempt:** during the player's attack startup, attempts parry with limited probability and reaction delay.
- **Punish:** if the player whiffs or is in recovery, tries to attack.
- **Posture pressure:** if player posture is low, bot becomes more aggressive.
- **Cooldowns:** attack, roll, block, and parry decisions have cooldowns to prevent spam.

Recommended initial tuning:

- Reaction delay: 180-280 ms.
- Parry chance: 40%.
- Block chance under pressure: 65%.
- Retreat threshold: bot posture below 35%.
- Aggressive threshold: player posture below 35%.
- Attack decision cooldown: 450-750 ms.
- Roll cooldown: 1200-1800 ms.

## Combat Requirements

The current attack is too abstract for a real duel. This milestone should introduce explicit timing:

- Attack has startup, active, and recovery windows.
- During active frames, the attack owns a hitbox in front of the attacker.
- Fighters own hurtboxes based on body position.
- One attack can hit a given target only once.
- Block/parry resolution is based on defender state at the moment hitbox overlaps hurtbox.
- Parry only uses the initial parry window; held defense becomes normal block.
- Roll invulnerability should ignore overlapping hitboxes only during invulnerable frames.

## Architecture

The next implementation should split scene concerns from fighter/controller concerns:

- `FighterEntity`: Phaser sprite, combat model, facing, controller, hit tracking, and animation sync.
- `PlayerController`: converts keyboard/mouse input to fighter intents.
- `BotController`: converts bot AI decisions to fighter intents.
- `CombatSystem`: updates attack windows, hitbox/hurtbox overlap, and hit resolution.
- `RoundSystem`: detects death, reset, and simple win/loss text.
- `GameScene`: owns Phaser lifecycle, arena, entities, HUD, and debug drawing.

This keeps the future multiplayer path clean: a later `RemoteController` can feed the same intents as `PlayerController` or `BotController`.

## Success Criteria

- Player can fight a visible bot using the same swordsman animations.
- Bot approaches, retreats, blocks, attacks, and sometimes parries.
- Bot does not parry perfectly every time.
- Clean hits, blocked hits, parries, rolls, and posture breaks are all observable.
- The bot can punish careless attacks often enough to expose combat issues.
- The player can still win through spacing, timing, parry, and posture pressure.
- Tests cover hitbox overlap, one-hit-per-attack, block/parry outcomes, and bot decision cases.
