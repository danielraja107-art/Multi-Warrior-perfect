# Storm Arena — Member 1 Tech Lead Development TODO

> **Role:** Member 1 — Tech Lead / Server & Core Gameplay Lead
>
> **Primary responsibility:** Authoritative server, multiplayer networking, shared contracts, gameplay simulation, combat, AI, waves, weapons, boss logic, lag compensation, server security, integration architecture.
>
> **Source:** Storm Arena project specification v1.0.

---

## 0. Role Definition

### Primary ownership

- [ ] Own server architecture and authoritative game simulation.
- [ ] Own Colyseus room lifecycle and multiplayer networking.
- [ ] Own the shared gameplay contracts used by client and server.
- [ ] Own server-side movement validation and reconciliation support.
- [ ] Own combat validation, hitboxes, damage, knockback, cooldowns.
- [ ] Own enemy simulation and AI.
- [ ] Own weapon gameplay rules.
- [ ] Own WaveDirector and SpawnManager.
- [ ] Own BossSystem and boss state transitions.
- [ ] Own lag compensation / position history.
- [ ] Own server-side validation and anti-cheat basics.
- [ ] Lead integration between Member 2 (3D client) and Member 3 (UI/platform).

### Primary folders

```text
server/
├── rooms/
├── gameplay/
│   ├── combat/
│   ├── enemies/
│   ├── weapons/
│   ├── waves/
│   └── bosses/
├── lag/
├── auth/
└── services/

shared/
├── schemas/
├── constants/
├── types/
└── messages/
```

### Files you primarily own

```text
server/rooms/GameRoom.ts
server/gameplay/combat/*
server/gameplay/enemies/*
server/gameplay/weapons/*
server/gameplay/waves/*
server/gameplay/bosses/*
server/lag/PositionHistory.ts
shared/schemas/GameState.ts
shared/messages/index.ts
shared/constants/*
shared/types/index.ts
```

---

# PHASE 0 — BUILD FOUNDATION

## Goal

Create the contracts and server foundation that allow the other two members to work in parallel.

**Important:** Do NOT finish the entire backend before Members 2 and 3 start. Build only the foundation they depend on, then release stable contracts.

## 0.1 Repository and architecture

- [x] Verify monorepo/project structure.
- [x] Create/verify `client/`, `server/`, `shared/`, `database/`, `docs/`.
- [x] Configure TypeScript for server and shared code.
- [x] Configure shared import paths.
- [x] Establish formatting/linting rules.
- [x] Establish development scripts for client and server.
- [ ] Verify local client + server startup.
- [x] Document environment variables required by the server.

## 0.2 Shared contracts — highest priority

- [x] Create `shared/schemas/GameState.ts`.
- [x] Define `Vector3` schema.
- [x] Define `Player` schema.
- [x] Define `Enemy` schema.
- [x] Define `Boss` schema.
- [x] Define `WeaponPickup` schema.
- [x] Define `GameState` schema.
- [x] Create `shared/types/index.ts`.
- [x] Create `shared/messages/index.ts`.
- [x] Define `PLAYER_MOVE`.
- [x] Define `PLAYER_ATTACK`.
- [x] Define `PLAYER_DODGE`.
- [x] Define `PLAYER_BLOCK`.
- [x] Define `PLAYER_PICKUP`.
- [x] Define `PLAYER_THROW`.
- [x] Define server event/message types from the specification.
- [x] Define initial shared constants for player colors, states, phases, and gameplay enums.

## 0.3 Shared gameplay constants

- [x] Create `shared/constants/weapons.ts`.
- [x] Add Fist profile.
- [x] Add Stick profile.
- [x] Add Baseball Bat profile.
- [x] Add Axe profile.
- [x] Add Hammer profile.
- [x] Add Rock profile.
- [x] Create `shared/constants/enemies.ts`.
- [x] Add Basic enemy stats.
- [x] Add Fast enemy stats.
- [x] Add Heavy enemy stats.
- [x] Add Shield enemy stats.
- [x] Add Ranged enemy stats.
- [x] Add Elite enemy stats.
- [x] Create `shared/constants/waves.ts`.
- [x] Define wave budget rules and initial wave compositions.

## 0.4 Basic Colyseus server

- [x] Create Colyseus server application.
- [x] Create `GameRoom.ts`.
- [x] Register the room.
- [x] Initialize `GameState` when a room starts.
- [x] Support a player joining a room.
- [x] Assign a player ID.
- [x] Assign player color from the fixed four-color order.
- [x] Support room state updates.
- [x] Establish the server tick/update loop.
- [x] Confirm the target simulation tick is 20 Hz.

## FOUNDATION GATE — RELEASE TO TEAM

Before continuing into deep gameplay, confirm:

- [x] `GameState.ts` is usable by both client and server.
- [x] Message types compile on both sides.
- [x] Shared constants compile.
- [x] Client can connect to the Colyseus server.
- [x] One player can join a room.
- [x] One player's authoritative position can exist in server state.
- [x] Member 2 can start Player/3D work without waiting for more backend features.
- [x] Member 3 can start Main Menu/Create Room/Join Room/Lobby work without waiting for gameplay systems.
- [x] Document the contract versions in the team README.

**At this point, Members 2 and 3 should be actively working in parallel.**

---

# PHASE 1 — CORE SERVER MOVEMENT

## Goal

Provide a working server-authoritative movement path for one player.

### Tasks

- [x] Implement player input queue.
- [x] Validate `PLAYER_MOVE` input.
- [x] Reject invalid direction values.
- [x] Apply movement on the server.
- [x] Keep server position authoritative.
- [x] Update player position in `GameState`.
- [x] Broadcast authoritative position through Colyseus state sync.
- [x] Add basic movement boundaries.
- [x] Verify 20 Hz server update loop.
- [x] Add basic server-side movement tests.

### Handoff / integration

- [x] Tell Member 2 the exact movement contract.
- [x] Verify Member 2 can render the authoritative position.
- [x] Verify local movement prediction can reconcile to server state.
- [x] Do not require Member 2 to wait for combat, AI, or waves.

### Done when

- [x] One browser moves a player.
- [x] Server owns the final position.
- [x] Client receives authoritative position updates.
- [x] No state is accepted from the client as truth.

---

# PHASE 2 — MULTIPLAYER FOUNDATION

## Goal

Support 2–4 players in one room with room code, host state, lobby state, and reconnection.

### Room lifecycle

- [ ] Implement room creation.
- [ ] Generate room code.
- [ ] Implement room joining by code.
- [ ] Set Player 1 as host.
- [ ] Track player count.
- [ ] Enforce 2–4 player room limit according to project rules.
- [ ] Implement host `START` command.
- [ ] Transition room from `lobby` to `game` phase.
- [ ] Prevent non-host start when host authority is required.
- [ ] Handle player disconnect.
- [ ] Hold disconnected player slot for 30 seconds.
- [ ] Support reconnect into the same room.
- [ ] Restore the player's current state.
- [ ] Remove the slot after the reconnect window expires.
- [ ] Destroy the room when no players remain.

### Player synchronization

- [ ] Spawn each player in an appropriate position.
- [ ] Assign Red / Blue / Green / Yellow player color order.
- [ ] Synchronize position.
- [ ] Synchronize rotation.
- [ ] Synchronize alive/dead state.
- [ ] Synchronize health.
- [ ] Synchronize host state.
- [ ] Validate movement from all connected clients.

### Difficulty

- [ ] Add `easy`, `normal`, `hard` room difficulty state.
- [ ] Validate that only authorized lobby action changes difficulty.
- [ ] Broadcast difficulty changes.
- [ ] Freeze difficulty after game start unless explicitly designed otherwise.

### Integration gate

- [ ] Test 2 clients.
- [ ] Test 3 clients.
- [ ] Test 4 clients.
- [ ] Test one disconnect.
- [ ] Test reconnect within 30 seconds.
- [ ] Test reconnect after 30 seconds.
- [ ] Verify Member 3 lobby UI receives all required state.
- [ ] Verify Member 2 can render all four players.

---

# PHASE 3 — COMBAT PROTOTYPE

## Goal

Create authoritative fist combat with light/heavy attacks, hitboxes, damage, knockback, dodge, block, and lag compensation foundation.

### Attack validation

- [ ] Validate player exists.
- [ ] Validate player is alive.
- [ ] Validate player is not in an invalid state.
- [ ] Validate weapon matches server-held weapon.
- [ ] Validate cooldown.
- [ ] Validate attack type.
- [ ] Accept attack timestamp.
- [ ] Reject malformed attack input.

### Hitbox system

- [ ] Create `HitboxSystem.ts`.
- [ ] Define fist sphere hitbox.
- [ ] Define active frames for fist.
- [ ] Track attack start time/frame.
- [ ] Activate hitbox only during active window.
- [ ] Deactivate hitbox outside active window.
- [ ] Implement one-hit-per-swing-per-enemy tracking.
- [ ] Ensure repeated overlap does not repeatedly damage the same enemy.

### Damage system

- [ ] Create `DamageSystem.ts`.
- [ ] Apply base fist damage.
- [ ] Apply light attack multiplier.
- [ ] Apply heavy attack multiplier.
- [ ] Clamp health at zero.
- [ ] Trigger enemy state transition after damage.
- [ ] Track player damage and kill contribution.

### Knockback

- [ ] Create `KnockbackSystem.ts`.
- [ ] Calculate knockback direction.
- [ ] Apply weapon knockback value.
- [ ] Integrate with Rapier.
- [ ] Support wall impact.
- [ ] Support enemy-to-enemy chain knockback where applicable.

### Dodge / block

- [ ] Validate dodge input.
- [ ] Apply dodge distance.
- [ ] Enforce dodge cooldown.
- [ ] Validate block state.
- [ ] Apply block damage reduction.
- [ ] Prevent invalid actions during incompatible states.

### Lag compensation foundation

- [ ] Create `PositionHistory.ts`.
- [ ] Capture enemy positions every server tick.
- [ ] Keep approximately the last one second of history.
- [ ] Use attack timestamp and latency information for rewind validation.
- [ ] Select appropriate historical snapshot.
- [ ] Perform hit detection against rewound state.
- [ ] Add tests for low, medium, and higher latency cases.

### Integration gate

- [ ] Member 2's attack animation sends the correct message.
- [ ] Member 2 receives hit result/state changes.
- [ ] Member 3 can display health/damage feedback.
- [ ] Test two players attacking one enemy simultaneously.
- [ ] Test one attack overlapping an enemy for multiple frames.
- [ ] Test attack at non-zero latency.

---

# PHASE 4 — ENEMY SYSTEM + AI

## Goal

Implement server-authoritative enemies that detect, chase, attack, stagger, knock back, recover, and die.

### Base enemy architecture

- [ ] Create `EnemySystem.ts`.
- [ ] Create reusable enemy base logic.
- [ ] Add enemy IDs.
- [ ] Add enemy health/max health.
- [ ] Add enemy state.
- [ ] Add enemy position/rotation.
- [ ] Add target player selection.

### AI state machine

- [ ] Implement IDLE.
- [ ] Implement DETECT.
- [ ] Implement CHASE.
- [ ] Implement ATTACK.
- [ ] Implement RECOVER.
- [ ] Implement STAGGER.
- [ ] Implement KNOCKBACK.
- [ ] Implement DEAD.
- [ ] Implement transitions between states.
- [ ] Prevent invalid state transitions.

### Enemy types

- [ ] Implement BasicEnemy.
- [ ] Implement FastEnemy.
- [ ] Implement HeavyEnemy.
- [ ] Implement ShieldEnemy when required by the current phase.
- [ ] Implement RangedEnemy when required by the current phase.
- [ ] Implement EliteEnemy.

### Scaling

- [ ] Apply enemy health scaling per wave.
- [ ] Apply enemy damage scaling per wave.
- [ ] Use shared enemy constants.
- [ ] Prevent client-controlled enemy stats.

### AI testing

- [ ] Test target acquisition.
- [ ] Test chase behavior.
- [ ] Test attack range.
- [ ] Test stagger interruption.
- [ ] Test knockback.
- [ ] Test death/removal.
- [ ] Test multiple enemies attacking the same player.

### Integration gate

- [ ] Member 2 can render all authoritative enemy states.
- [ ] Enemy animation state follows server state.
- [ ] Member 3 can show enemy count and wave data later.
- [ ] Verify no client can create/modify enemy health or position.

---

# PHASE 5 — WEAPON SYSTEM

## Goal

Implement server-authoritative weapon pickups, equipped weapons, unique weapon hitboxes, cooldowns, and drops.

### Weapon ownership

- [x] Create `WeaponSystem.ts`.
- [x] Spawn weapon pickups from server.
- [x] Assign weapon IDs.
- [x] Track available/unavailable status.
- [x] Validate pickup distance.
- [x] Validate pickup availability.
- [x] Assign weapon to player.
- [x] Drop previous weapon.
- [x] Broadcast updated weapon state.

### Weapon gameplay

- [x] Implement Fist.
- [x] Implement Stick.
- [x] Implement Baseball Bat.
- [x] Implement Axe.
- [x] Implement Hammer.
- [x] Implement Rock.

### Per-weapon combat rules

- [x] Configure damage.
- [x] Configure knockback.
- [x] Configure cooldown.
- [x] Configure active frames.
- [x] Configure hitbox shape.
- [x] Configure weapon-specific attack state.

### Rock projectile

- [x] Implement server-authoritative rock projectile.
- [x] Apply gravity arc with Rapier (server gravity simulation).
- [x] Validate throw direction.
- [x] Validate throw action.
- [x] Detect projectile hit.
- [x] Apply damage and knockback.

### Weapon drops

- [x] Drop equipped weapon on player death.
- [x] Make dropped weapon available for pickup.
- [x] Prevent duplicate ownership.
- [x] Respawn weapons between waves according to wave lifecycle.

### Integration gate

For each weapon:

- [x] Member 2 has corresponding visual/animation.
- [x] Member 3 has pickup/weapon HUD support where needed.
- [x] Server behavior matches shared weapon profile.
- [x] Test pickup.
- [x] Test attack.
- [x] Test cooldown.
- [x] Test damage.
- [x] Test knockback.
- [x] Test drop.

---

# PHASE 6 — WAVE SYSTEM

## Goal

Build the complete server-driven wave director and spawn lifecycle.

### WaveDirector

- [x] Create `WaveDirector.ts`.
- [x] Calculate enemy budget.
- [x] Apply player-count scaling.
- [x] Apply difficulty multiplier.
- [x] Select enemy composition.
- [x] Track active wave.
- [x] Track enemies remaining.
- [x] Detect wave completion.
- [x] Trigger rest period.
- [x] Trigger next wave.
- [x] Trigger boss phase after the final wave.

### SpawnManager

- [x] Create `SpawnManager.ts`.
- [x] Define spawn positions.
- [x] Prevent unsafe spawns near players.
- [x] Stagger enemy spawning over the configured 3–5 second period.
- [x] Track spawned enemies.
- [x] Notify WaveDirector when all wave enemies are resolved.

### Rest period

- [x] Implement 10-second rest period.
- [x] Heal players by 20 HP.
- [x] Trigger weapon respawn.
- [x] Prevent next wave from beginning early.
- [x] Broadcast `WAVE_COMPLETE`.

### Wave data

- [x] Implement Wave 1 composition.
- [x] Implement Wave 2 composition.
- [x] Implement Wave 3 composition.
- [x] Implement Wave 4 composition / elite assault.
- [x] Implement Wave 5 boss trigger.

### Integration gate

- [x] Member 3 receives wave start.
- [x] Member 3 receives wave complete.
- [x] Member 2 sees spawned enemies correctly.
- [x] Test full wave lifecycle without boss.
- [x] Test player count 1–4 scaling rules where applicable.
- [x] Test Easy / Normal / Hard.

---

# PHASE 7 — BOSS SYSTEM

## Goal

Create the authoritative boss state machine and phase logic.

### Boss state

- [x] Create `BossSystem.ts`.
- [x] Initialize boss health.
- [x] Scale max health by player count.
- [x] Track active/inactive state.
- [x] Track phase.
- [x] Track current attack.
- [x] Track enraged state.
- [x] Track boss position.

### Phase thresholds

- [x] Phase 1: 100–75%.
- [x] Phase 2: 75–50%.
- [x] Phase 3: 50–20%.
- [x] Enraged: below 20%.
- [x] Death at 0 HP.

### Boss attacks

- [x] Phase 1 heavy punch.
- [x] Phase 1 sweep.
- [x] Phase 2 charge.
- [x] Phase 2 slam.
- [x] Phase 2 roar.
- [x] Phase 3 spin attack.
- [x] Phase 3 grab & throw.
- [x] Enraged behavior.

### Boss validation

- [x] Boss attack timing is server authoritative.
- [x] Boss damage is server authoritative.
- [x] Boss phase transitions cannot be client triggered.
- [x] Boss health cannot be modified by client state.
- [x] Broadcast phase transitions.
- [x] Broadcast enraged state.
- [x] Broadcast boss death.
- [x] Transition room to victory after boss death.

### Integration gate

- [x] Member 2 can map `phase` to boss animations.
- [x] Member 2 can map `isEnraged` to animation speed/visuals.
- [x] Member 2 can react to boss attack state.
- [x] Member 3 can render boss health.
- [x] Member 3 can render phase/victory UI.
- [x] Complete boss fight with real client + server.

---

# PHASE 8 — PROGRESSION / DATABASE BACKEND

## Goal

Persist account and match results after the gameplay loop is stable.

> **Primary ownership here is shared with Member 3.** Member 3 owns the database implementation and REST/UI integration; Member 1 owns the gameplay-side data contract and match-result generation.

### Member 1 responsibilities

- [x] Define server-side match statistics object.
- [x] Track kills per player.
- [x] Track damage per player.
- [x] Track deaths per player.
- [x] Track waves cleared.
- [x] Track boss defeated status.
- [x] Track match duration.
- [x] Calculate XP according to the project formula.
- [x] Generate the final match result payload.
- [x] Trigger match-save workflow when a match ends.
- [x] Ensure gameplay server remains authoritative for match stats.

### Integration with Member 3

- [x] Define exact MatchStats contract.
- [x] Define exact XP payload.
- [x] Define authenticated user/player mapping.
- [x] Verify match data is saved only after the match ends.
- [x] Verify active positions/health/enemy state are not treated as persistent DB state.

---

# PHASE 9 — PRODUCTION / SECURITY / SERVER HARDENING

## Goal

Prepare the authoritative server for real users.

### Validation

- [x] Validate every client message.
- [x] Reject malformed payloads.
- [x] Reject invalid player IDs.
- [x] Reject impossible movement speeds.
- [x] Reject impossible attack frequency.
- [x] Reject impossible damage values.
- [x] Reject invalid weapon claims.
- [x] Reject invalid state transitions.

### Anti-cheat basics

- [x] Detect speed hacks.
- [x] Detect abnormal attack frequency.
- [x] Detect damage sanity violations.
- [x] Keep all final gameplay values server-side.
- [x] Never trust client position as authoritative.
- [x] Never trust client damage as authoritative.
- [x] Never trust client enemy state.

### Stability

- [x] Add server error logging.
- [x] Add room lifecycle logging.
- [x] Add connection/disconnection logging.
- [x] Handle unexpected client disconnects.
- [x] Handle room shutdown.
- [x] Handle server-side gameplay exceptions safely.
- [x] Add server health checks.
- [x] Prepare crash/restart behavior.

### Performance

- [x] Profile server tick duration.
- [x] Profile enemy AI cost.
- [x] Profile hitbox calculations.
- [x] Profile physics cost.
- [x] Profile state synchronization volume.
- [x] Test 4-player rooms under combat load.
- [x] Load test multiple rooms later.

### Optional later infrastructure

- [x] Redis is NOT required for the initial version.
- [x] Evaluate Redis only after the single-server architecture is stable.
- [x] Add session/cache/pub-sub infrastructure only when required by scale.

---

# CROSS-PHASE TECH LEAD CHECKLIST

Use this continuously throughout development.

## Shared contract discipline

- [ ] Never casually change `GameState.ts`.
- [ ] Never casually change message names or payload shapes.
- [ ] Announce breaking contract changes before implementation.
- [ ] Update shared constants before dependent gameplay implementation.
- [ ] Keep server and client on compatible shared contract versions.

## Integration discipline

- [ ] Every completed server feature has a testable client contract.
- [ ] Every feature has an acceptance test.
- [ ] Test with at least two clients for multiplayer-sensitive features.
- [ ] Test latency-sensitive systems with artificial delay.
- [ ] Do not merge broken shared contracts.

## Code review discipline

- [ ] No direct feature pushes to `main`.
- [ ] Use feature branches.
- [ ] Review shared-contract changes carefully.
- [ ] Keep PRs focused on one feature.
- [ ] Require integration testing before a feature is marked done.

---

# GIT WORKFLOW — MEMBER 1

```text
main
  │
  └── develop
        │
        ├── feature/game-state
        ├── feature/colyseus-room
        ├── feature/player-movement-server
        ├── feature/combat-hitbox
        ├── feature/damage-system
        ├── feature/knockback
        ├── feature/lag-compensation
        ├── feature/enemy-ai
        ├── feature/weapon-system
        ├── feature/wave-director
        └── feature/boss-system
```

### Rules

- [ ] Create one focused branch per feature.
- [ ] Rebase/update from `develop` before opening a PR when appropriate.
- [ ] Review your own diff before PR.
- [ ] Run tests before PR.
- [ ] Include integration notes in PR description.
- [ ] Do not rewrite or force-push shared branches without agreement.

---

# DEFINITION OF DONE — MEMBER 1

A server feature is **DONE** only when all applicable items are true:

- [ ] Logic implemented.
- [ ] Shared contract updated if needed.
- [ ] Server validates client input.
- [ ] Unit/integration tests added where appropriate.
- [ ] TypeScript/build passes.
- [ ] No unintended state mutation.
- [ ] Multiplayer behavior checked.
- [ ] Client integration verified.
- [ ] Documentation/comments updated for non-obvious logic.
- [ ] PR reviewed.
- [ ] Feature merged to `develop`.
- [ ] Playtest confirms the intended behavior.

---

# MEMBER 1 → MEMBER 2 HANDOFF CHECKLIST

Before asking Member 2 to integrate a server feature:

- [ ] Message/event name is final.
- [ ] Payload shape is documented.
- [ ] Relevant state field is final.
- [ ] Expected state transitions are documented.
- [ ] Server authoritative behavior is documented.
- [ ] Example input/output is available.
- [ ] Error/rejection behavior is documented.

Example:

```text
PLAYER_ATTACK

Input:
{
  type: "light" | "heavy",
  weapon: string,
  timestamp: number
}

Server validates:
- player alive
- cooldown
- valid state
- valid weapon
- valid timestamp

Server result:
- authoritative enemy health
- enemy state
- hit/impact event or equivalent state change
```

---

# MEMBER 1 → MEMBER 3 HANDOFF CHECKLIST

- [ ] Room phase is defined.
- [ ] Player count is available.
- [ ] Player colors are available.
- [ ] Difficulty is available.
- [ ] Wave number is available.
- [ ] Enemies remaining is available.
- [ ] Boss health is available.
- [ ] Boss phase is available.
- [ ] Victory/game-over state is available.
- [ ] Match statistics contract is defined.
- [ ] XP result payload is defined.

---

# VERTICAL SLICE — MEMBER 1 EXIT CHECKLIST

The server side of the first complete playable game should eventually support:

- [ ] 2–4 players connect by room code.
- [ ] Lobby state and difficulty are authoritative.
- [ ] Player movement is server-authoritative.
- [ ] Movement prediction can reconcile with server state.
- [ ] Fist light attack works.
- [ ] Fist heavy attack works.
- [ ] Server hit detection works.
- [ ] Lag compensation works.
- [ ] Damage works.
- [ ] Knockback works.
- [ ] Dodge works.
- [ ] Block works.
- [ ] Bat works.
- [ ] Stick works.
- [ ] Axe works.
- [ ] Hammer works.
- [ ] Rock works.
- [ ] Basic enemy works.
- [ ] Fast enemy works.
- [ ] Heavy enemy works.
- [ ] Elite enemy works.
- [ ] Five-wave lifecycle works.
- [ ] Boss spawns after the final wave.
- [ ] Boss phases work.
- [ ] Enraged state works.
- [ ] Boss death triggers victory.
- [ ] Match statistics are generated.
- [ ] No client can directly author gameplay truth.

---

# TECH LEAD PRIORITY ORDER

When multiple tasks are available, prioritize them in this order:

```text
1. Shared contracts
2. Server authority
3. Core gameplay correctness
4. Multiplayer synchronization
5. Combat feel support
6. AI correctness
7. Wave/boss lifecycle
8. Match statistics
9. Security validation
10. Performance / scaling
```

Do NOT prioritize:

- [ ] Redis before it is needed.
- [ ] Extra arenas before the vertical slice is fun.
- [ ] Extra enemy types before the core enemies are stable.
- [ ] Advanced leaderboard infrastructure before match persistence works.
- [ ] Large refactors during active integration unless necessary.

---

# FINAL TECH LEAD PRINCIPLE

```text
DO NOT:
Finish the entire server → then give work to Members 2 and 3.

DO:
Build the contract → release the contract → work in parallel → integrate → test → continue.
```

The Tech Lead's job is to remove blockers, protect the architecture, and keep the authoritative simulation correct — not to become the only person writing code.
