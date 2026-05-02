# Gothic PvP Vertical Slice Design

## Goal

Build a first playable vertical slice for a future PvP-focused 2D action platformer. The prototype validates the core combat feel with one playable gothic swordsman against a training dummy before adding local PvP, bot behavior, or online multiplayer.

## Core Direction

The game uses a side-view 2D action camera with a mostly flat arena. The combat should feel like a responsive platformer mixed with a timing-focused duel: spacing, startup, recovery, blocking, posture, parry timing, and short punish windows matter more than long combos.

The first character is a tall, elegant gothic swordsman in pixel art: vampire-hunter mood, dark cape or coat, readable silhouette, and a medium-range straight sword or rapier. The art direction should evoke 1990s gothic action platformers without copying any existing game directly.

## MVP Scope

The first build is a stylized combat sandbox:

- One playable character.
- One training dummy.
- A flat gothic arena.
- HUD for player and dummy life/posture.
- Keyboard and mouse controls.
- Attack, block, parry, roll, jump, posture break, and stun.
- Initial imagegen-created visual references and assets for character, arena, and impact feedback.

Out of scope for this slice:

- Online multiplayer.
- Character selection.
- Build crafting.
- Full AI.
- Multiple weapons.
- Complex platform layouts.

## Controls

- `A`: move left.
- `D`: move right.
- `Space`: jump.
- `Shift`: short roll with brief invulnerability.
- Left mouse button: attack.
- Right mouse button held: block.
- Right mouse button initial timing window: perfect block/parry.

The first implementation can use one primary attack on left click. Heavy attacks and attack variants can be added after the feel of the base attack, block, and posture loop is validated.

## Combat Model

Life exists, but posture is the main combat axis.

Clean hits deal meaningful life damage and posture damage. Blocked hits deal very little life damage but significant posture damage to the blocker. Perfect block/parry prevents most or all defensive posture loss and instead deals posture damage to the attacker.

When posture reaches zero, the target enters a short stun state. During this stun, the opponent should have enough time to land one guaranteed attack. After stun ends, posture recovers enough to return to neutral.

Roll has short movement and brief invulnerability. It is useful for repositioning or escaping pressure, but should be punishable if used predictably.

## Player State Model

The playable character should be implemented around explicit states:

- `idle`
- `run`
- `jump`
- `attack`
- `block`
- `parry`
- `roll`
- `hitstun`
- `postureBroken`

States should own timing windows such as attack startup, active frames, recovery, parry window, roll invulnerability, and stun duration. This keeps the later transition to player two, bot, or network replication clearer.

## Art Direction

Use imagegen early, but treat generated images as source material and references, not final animation truth. The project should convert visual direction into consistent sprite frames and effects.

Initial assets:

- Gothic swordsman concept/sprite reference.
- Idle pose.
- Attack pose or slash frame.
- Block/parry pose.
- Roll pose.
- Hit/parry/posture-break effects.
- Flat gothic arena background and floor.

The visual style should prioritize readable PvP silhouettes and combat effects over decorative detail.

## Architecture

Use Phaser for the first web prototype. Keep combat logic separated from Phaser rendering where practical:

- Phaser scene manages assets, physics, input, camera, and rendering.
- Fighter model/state code manages health, posture, movement state, attack windows, block/parry logic, and stun.
- Combat resolver handles hit detection outcomes and applies damage/posture changes.
- HUD code renders life/posture without owning combat rules.

This structure should make it possible to reuse the same fighter logic for a second local player, dummy behavior, bot behavior, and future multiplayer replication.

## Testing And Verification

The first verification target is a playable browser prototype. Manual checks should confirm:

- Movement feels responsive.
- Jump and roll are distinct.
- Left click attacks.
- Right click blocks.
- Early right click parries.
- Blocked attacks mostly preserve life but reduce posture.
- Parry damages attacker posture.
- Posture break causes short stun.
- Stun allows one guaranteed attack.
- HUD reflects life/posture changes clearly.

Automated tests should cover pure combat logic where possible: posture damage, blocked damage, parry outcomes, posture break, stun duration, and roll invulnerability timing.
