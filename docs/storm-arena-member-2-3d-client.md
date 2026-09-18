# Storm Arena — Member 2 Development TODO

**Role:** Member 2 — 3D Client / Gameplay Presentation Lead  
**Primary Areas:** React Three Fiber, Three.js, Rapier client integration, player/enemy/boss rendering, camera, effects, animation, assets, audio  
**Works With:** Member 1 (Tech Lead / Server) and Member 3 (UI / Platform)

---

# 0. ROLE RULES

Member 2 owns the **visual and client-side game experience**.

You are responsible for making the server state look and feel like a real game in the browser.

### Primary ownership

- [ ] React Three Fiber / Three.js scene
- [ ] Player rendering
- [ ] Player controller and local input
- [ ] Movement presentation
- [ ] Client-side movement prediction / reconciliation
- [ ] Enemy rendering
- [ ] Weapon rendering
- [ ] Boss rendering
- [ ] Group-follow camera
- [ ] Client-side Rapier integration
- [ ] Animation playback
- [ ] Hit effects
- [ ] Knockback presentation
- [ ] Weapon trails
- [ ] Rain / lightning / environmental effects
- [ ] Audio manager and gameplay audio
- [ ] Asset loading / organization / optimization support
- [ ] Client-side performance

### Do NOT own

- [ ] Server-authoritative damage
- [ ] Server hit validation
- [ ] Server enemy AI decisions
- [ ] Server wave decisions
- [ ] Server boss phase authority
- [ ] Database schema / migrations
- [ ] Authentication implementation
- [Authoritative game-state decisions]

Those belong primarily to Member 1 and Member 3.

---

# 1. CORE PROJECT CONTRACT

The game is an online 2–4 player cooperative 3D arena beat-'em-up.

Core pillars:

- [ ] Cooperative gameplay
- [ ] Melee-only combat
- [ ] Wave-based progression
- [ ] Server-authoritative simulation

The client must treat server state as authoritative.

Reference gameplay flow:

```text
MAIN MENU
   ↓
CREATE / JOIN ROOM
   ↓
LOBBY
   ↓
START
   ↓
WAVE 1
   ↓
WAVE 2
   ↓
WAVE 3
   ↓
ELITE ASSAULT
   ↓
BOSS
   ↓
VICTORY
   ↓
RESULTS + XP
```

---

# 2. PHASE 0 — CLIENT FOUNDATION

## Goal

Create the complete client-side foundation so Member 2 can work independently without waiting for the entire backend.

Member 1 only needs to provide the initial shared contracts needed for integration.

## 2.1 Project setup

- [ ] Verify React + Vite project
- [ ] Verify TypeScript configuration
- [ ] Install React Three Fiber
- [ ] Install Three.js
- [ ] Install `@react-three/drei`
- [ ] Install client-side Rapier package
- [ ] Install Zustand
- [ ] Install Tailwind CSS if required by the project setup
- [ ] Establish client source folders

Expected structure:

```text
client/
└── src/
    ├── app/
    ├── ui/
    ├── game/
    │   ├── scene/
    │   ├── camera/
    │   ├── players/
    │   ├── enemies/
    │   ├── bosses/
    │   ├── weapons/
    │   ├── effects/
    │   ├── physics/
    │   └── audio/
    ├── network/
    └── state/
```

## 2.2 3D renderer foundation

- [ ] Create R3F `<Canvas>`
- [ ] Add scene
- [ ] Add basic lighting
- [ ] Add test floor
- [ ] Add placeholder player
- [ ] Verify camera rendering
- [ ] Verify responsive canvas
- [ ] Verify development FPS is stable

## 2.3 Placeholder player

- [ ] Create placeholder player mesh
- [ ] Add player transform
- [ ] Add player rotation
- [ ] Add player color system
- [ ] Support four player colors:
  - [ ] Red
  - [ ] Blue
  - [ ] Green
  - [ ] Yellow

## 2.4 Client physics

- [ ] Create `PhysicsWorld.tsx`
- [ ] Initialize Rapier world
- [ ] Create arena floor collider
- [ ] Create basic player collider
- [ ] Verify player remains grounded
- [ ] Verify collision with walls
- [ ] Keep collider dimensions aligned with the project specification

Player collider:

```text
Capsule
height: 1.8
radius: 0.3
```

## 2.5 Input foundation

- [ ] Implement WASD movement input
- [ ] Prepare controller for left-stick support
- [ ] Implement Shift / L2 run
- [ ] Implement Space / Cross dodge input
- [ ] Implement left-click / Square light attack input
- [ ] Implement right-click / Triangle heavy attack input
- [ ] Implement E / Circle interaction input
- [ ] Implement Q / L1 block input
- [ ] Implement F / R1 throw input
- [ ] Keep input generation separate from rendering

---

# 3. PHASE 0 HANDOFF GATE

Member 2 does NOT need the whole server before continuing.

You may proceed independently when the following are available:

### Required from Member 1

- [ ] Basic `GameState` shape
- [ ] Player state fields
- [ ] Player position fields
- [ ] Player rotation field
- [ ] Player color field
- [ ] Player state field
- [ ] `PLAYER_MOVE` message contract

### After those contracts exist

Member 2 can continue:

```text
Client scene
   +
Player controller
   +
Camera
   +
Local movement
   +
Placeholder networking adapter
```

Do NOT wait for:

- [ ] Combat server
- [ ] Enemy AI
- [ ] Wave system
- [ ] Boss system
- [ ] Database
- [ ] Authentication

---

# 4. PHASE 1 — PLAYER CONTROLLER

## Goal

Create the complete client-side player movement experience.

## 4.1 Player controller

- [ ] Create `PlayerController.tsx`
- [ ] Read input
- [ ] Calculate desired movement direction
- [ ] Normalize movement vector
- [ ] Apply walk speed
- [ ] Apply run speed
- [ ] Rotate player toward movement direction
- [ ] Handle stopped / moving state
- [ ] Handle basic gravity
- [ ] Handle floor contact
- [ ] Keep movement logic independent from player mesh

Base values:

```text
Move Speed: 5 units/s
Run Speed: 9 units/s
```

## 4.2 Movement prediction

The project predicts movement locally and lets the server correct disagreement.

Implement:

- [ ] Local movement prediction
- [ ] Send movement intent to server
- [ ] Receive authoritative position
- [ ] Compare predicted position vs server position
- [ ] Apply smooth correction
- [ ] Avoid obvious rubber-banding for small differences
- [ ] Handle large corrections safely
- [ ] Prevent prediction from changing server authority

Expected concept:

```text
W pressed
   ↓
LOCAL movement immediately
   ↓
PLAYER_MOVE sent
   ↓
server validates
   ↓
server position received
   ↓
client reconciles
```

## 4.3 Remote players

- [ ] Render remote players
- [ ] Apply authoritative positions
- [ ] Smooth remote movement
- [ ] Avoid visually snapping every state update
- [ ] Apply player-specific colors
- [ ] Show nameplate when supported
- [ ] Distinguish local player from remote players

---

# 5. PHASE 2 — CAMERA SYSTEM

## Goal

Implement the documented cinematic group-follow camera.

Create:

```text
client/src/game/camera/GroupCamera.tsx
```

## Tasks

- [ ] Track all active players
- [ ] Calculate group center
- [ ] Calculate player spread
- [ ] Follow group center
- [ ] Zoom based on player separation
- [ ] Clamp zoom to configured limits
- [ ] Smooth camera movement
- [ ] Avoid excessive camera movement
- [ ] Keep all active players visible
- [ ] Handle dead / disconnected players correctly
- [ ] Prepare boss cinematic mode

Camera configuration:

```text
defaultHeight: 12
defaultDistance: 18
minZoom: 14
maxZoom: 28
zoomSpeed: 0.05
followSmoothness: 0.08
angle: -45°
```

## Boss camera

- [ ] Detect boss appearance
- [ ] Push camera toward boss for approximately one second
- [ ] Return to group-follow mode
- [ ] Smooth transition
- [ ] Avoid breaking multiplayer camera framing

---

# 6. PHASE 3 — CHARACTER MODEL + ANIMATION FOUNDATION

## Goal

Replace placeholders with real character assets.

The specification uses Mixamo-standard skeletons for players and enemies.

## 6.1 Player asset

- [ ] Obtain player base GLB
- [ ] Verify Mixamo skeleton
- [ ] Verify scale
- [ ] Verify orientation
- [ ] Verify materials
- [ ] Verify animation compatibility
- [ ] Place model under:

```text
client/public/assets/players/
```

## 6.2 Player animations

Required animation set:

- [ ] idle
- [ ] walk
- [ ] run
- [ ] jump
- [ ] fall
- [ ] dodge
- [ ] block
- [ ] block_hit
- [ ] punch_light
- [ ] punch_heavy
- [ ] bat_swing
- [ ] axe_swing
- [ ] hammer_swing
- [ ] stick_swing
- [ ] rock_throw
- [ ] hit_light
- [ ] hit_heavy
- [ ] knockdown
- [ ] getup
- [ ] pickup
- [ ] death
- [ ] victory

## 6.3 Animation controller

- [ ] Create reusable animation controller
- [ ] Map server state → visual animation
- [ ] Blend idle ↔ walk
- [ ] Blend walk ↔ run
- [ ] Trigger dodge
- [ ] Trigger attacks
- [ ] Trigger hit reactions
- [ ] Trigger knockdown
- [ ] Trigger death
- [ ] Trigger victory
- [ ] Avoid restarting an animation every frame
- [ ] Support animation playback speed where needed

---

# 7. PHASE 4 — COMBAT PRESENTATION

## Goal

Make combat visually responsive while server logic remains authoritative.

The documented flow is:

```text
PLAYER ATTACK
     ↓
client plays swing animation
     ↓
attack request sent
     ↓
server validates
     ↓
server determines hit
     ↓
all clients receive result
     ↓
client displays feedback
```

## Tasks

- [ ] Connect attack input to animations
- [ ] Play light attack animation
- [ ] Play heavy attack animation
- [ ] Play weapon swing animation
- [ ] Never apply authoritative damage locally
- [ ] Receive confirmed hit result
- [ ] Spawn hit effect
- [ ] Show reaction animation
- [ ] Show knockback presentation
- [ ] Trigger screen shake
- [ ] Play impact sound
- [ ] Handle miss without creating false damage feedback

## Hit effects

- [ ] Fist → small white spark
- [ ] Stick → wood crack particles
- [ ] Bat → stars + impact flash
- [ ] Axe → dark/blood particles
- [ ] Hammer → shockwave ring
- [ ] Rock → dust cloud

Do not move damage authority into the client.

---

# 8. PHASE 5 — WEAPON VISUAL SYSTEM

## Goal

Create reusable weapon visuals that work with server-defined weapon state.

Weapons:

- [ ] Fist
- [ ] Stick
- [ ] Baseball Bat
- [ ] Axe
- [ ] Hammer
- [ ] Rock

## Tasks

- [ ] Create `WeaponMesh.tsx`
- [ ] Create `WeaponPickup.tsx`
- [ ] Load correct model from weapon type
- [ ] Attach held weapon to player
- [ ] Detach when dropped
- [ ] Render pickup on arena
- [ ] Hide pickup after server confirms collection
- [ ] Render dropped weapon
- [ ] Render thrown rock
- [ ] Ensure visual weapon matches server weapon type

## Weapon-specific visual feedback

- [ ] Fist impact
- [ ] Stick impact
- [ ] Bat impact
- [ ] Axe impact
- [ ] Hammer impact
- [ ] Rock impact

## Weapon trails

- [ ] Create `WeaponTrail.tsx`
- [ ] Trigger only during relevant swing
- [ ] Keep trails lightweight
- [ ] Support different weapon sizes
- [ ] Avoid generating excessive objects every frame

---

# 9. PHASE 6 — ENEMY PRESENTATION

## Goal

Render server-controlled enemies convincingly.

Enemy types:

- [ ] Basic
- [ ] Fast
- [ ] Heavy
- [ ] Shield
- [ ] Ranged
- [ ] Elite

## Tasks

- [ ] Create reusable `Enemy.tsx`
- [ ] Create specialized enemy components when needed
- [ ] Render enemy position from server state
- [ ] Smooth remote enemy movement
- [ ] Render correct enemy model
- [ ] Render health state
- [ ] Map enemy states to animations
- [ ] Render attack animation
- [ ] Render stagger
- [ ] Render knockdown
- [ ] Render death
- [ ] Remove dead enemy visuals safely
- [ ] Avoid unnecessary React re-renders

Enemy animations:

- [ ] idle
- [ ] walk
- [ ] run
- [ ] attack
- [ ] stagger
- [ ] knockdown
- [ ] getup
- [ ] death

---

# 10. PHASE 7 — PHYSICS PRESENTATION

## Goal

Keep client-side physical presentation consistent with the documented Rapier setup.

Collider definitions:

```text
Player → Capsule
Enemy  → Capsule
Boss   → Capsule
Arena  → Static box/trimesh
Weapon → Sensor
Rock   → Sphere
```

Tasks:

- [ ] Player collider
- [ ] Enemy collider
- [ ] Boss collider
- [ ] Arena collision
- [ ] Weapon sensors
- [ ] Rock projectile visual physics
- [ ] Ground detection
- [ ] Knockback visual response
- [ ] Fall / knockdown presentation
- [ ] Wall collision feedback
- [ ] Avoid client physics becoming authoritative over server state

---

# 11. PHASE 8 — WAVE + ENVIRONMENT PRESENTATION

## Goal

Create the complete visual presentation for a wave-based match.

## Wave UI/game-world presentation

Member 3 owns the formal HUD, but Member 2 owns world-side visual effects.

- [ ] Enemy spawn visual
- [ ] Spawn timing presentation
- [ ] Wave start effect
- [ ] Wave completion effect
- [ ] Rest-period presentation
- [ ] Weapon respawn visual

## Storm Rooftop

Create:

```text
client/src/game/scene/Arena.tsx
```

Tasks:

- [ ] Build Storm Rooftop arena
- [ ] Add platform
- [ ] Add railings
- [ ] Add background industrial buildings
- [ ] Add night sky
- [ ] Add wet surfaces
- [ ] Add dark cinematic lighting
- [ ] Add neon accents
- [ ] Add rain particles
- [ ] Add lightning flashes
- [ ] Add arena boundaries
- [ ] Verify collision boundaries
- [ ] Keep visual quality balanced with FPS

---

# 12. PHASE 9 — AUDIO SYSTEM

Create:

```text
client/src/game/audio/AudioManager.ts
```

## Combat audio

- [ ] punch_light.mp3
- [ ] punch_heavy.mp3
- [ ] punch_miss.mp3
- [ ] bat_swing.mp3
- [ ] bat_impact.mp3
- [ ] axe_swing.mp3
- [ ] axe_impact.mp3
- [ ] hammer_swing.mp3
- [ ] hammer_impact.mp3
- [ ] stick_swing.mp3
- [ ] stick_impact.mp3
- [ ] rock_throw.mp3
- [ ] rock_impact.mp3
- [ ] block.mp3

## Enemy audio

- [ ] enemy_grunt.mp3
- [ ] enemy_stagger.mp3
- [ ] enemy_knockdown.mp3
- [ ] enemy_death.mp3
- [ ] elite_roar.mp3

## Event audio

- [ ] weapon_pickup.mp3
- [ ] weapon_drop.mp3
- [ ] wave_start.mp3
- [ ] wave_complete.mp3
- [ ] boss_entrance.mp3
- [ ] boss_phase_change.mp3
- [ ] boss_enraged.mp3
- [ ] boss_death.mp3
- [ ] player_death.mp3
- [ ] player_respawn.mp3
- [ ] victory.mp3

## Environment audio

- [ ] rain_ambient.mp3
- [ ] thunder_01.mp3
- [ ] thunder_02.mp3
- [ ] lightning_crack.mp3
- [ ] arena_hum.mp3

## Adaptive music

- [ ] Base combat music
- [ ] Increase intensity as enemies become fewer
- [ ] Elite intensity
- [ ] Boss phase 1
- [ ] Boss phase 2 layer
- [ ] Boss phase 3 layer
- [ ] Enraged layer
- [ ] Silence after boss death
- [ ] Victory theme

---

# 13. PHASE 10 — BOSS ASSET PIPELINE

## Goal

Integrate the custom villain GLB.

The specification says:

```text
Custom GLB
   ↓
Inspect
   ↓
Mixamo
   ↓
Animations
   ↓
Blender
   ↓
Merge
   ↓
Export GLB
   ↓
Compress
   ↓
React Three Fiber
```

## 13.1 Inspect villain

- [ ] Inspect GLB using gltf.report
- [ ] Check file size
- [ ] Check skeleton
- [ ] Check textures
- [ ] Check materials
- [ ] Check scale
- [ ] Determine whether re-rigging is required

## 13.2 Mixamo

- [ ] Upload villain
- [ ] Verify skeleton
- [ ] Get boss animations

Required boss animations:

- [ ] idle
- [ ] walk
- [ ] attack_heavy_punch
- [ ] attack_sweep
- [ ] roar
- [ ] phase2_transition
- [ ] attack_charge
- [ ] attack_slam
- [ ] phase3_transition
- [ ] attack_spin
- [ ] attack_grab_throw
- [ ] enrage
- [ ] death

## 13.3 Blender

- [ ] Import GLB
- [ ] Import animations
- [ ] Merge animations
- [ ] Name animation tracks exactly
- [ ] Verify animation transitions
- [ ] Export GLB
- [ ] Confirm animations are included

## 13.4 Compression

- [ ] Compress final GLB
- [ ] Inspect optimized output
- [ ] Verify animations still work
- [ ] Verify materials
- [ ] Verify textures
- [ ] Verify loading performance

---

# 14. PHASE 11 — BOSS CLIENT IMPLEMENTATION

Create:

```text
client/src/game/bosses/VillainBoss.tsx
```

## Tasks

- [ ] Load villain model
- [ ] Load boss animations
- [ ] Create animation actions
- [ ] Render boss position
- [ ] Render boss rotation
- [ ] Read boss health
- [ ] Read boss phase
- [ ] Read enraged state
- [ ] Play phase transition animation
- [ ] Play attack animations
- [ ] Play enrage animation
- [ ] Play death animation

## Boss phase presentation

```text
100–75% → Phase 1
75–50%  → Phase 2
50–20%  → Phase 3
<20%    → Enraged
0       → Death
```

## Enraged

- [ ] Set animation mixer speed to 1.6x when instructed by server state
- [ ] Restore normal speed when no longer enraged if applicable
- [ ] Add additional visual intensity
- [ ] Add stronger effects
- [ ] Coordinate with environment effects

## Boss environment reaction

- [ ] Phase 1 → normal storm
- [ ] Phase 2 → lights flicker/break
- [ ] Phase 3 → stronger rain/lightning
- [ ] Enraged → edge lightning hazards
- [ ] Death → storm clears + dramatic silence

Server remains the authority for phase changes.

---

# 15. PHASE 12 — NETWORK CLIENT INTEGRATION

Member 1 owns the server protocol.

Member 2 owns the client-side consumption of that protocol for rendering.

Create / maintain:

```text
client/src/network/
├── ColyseusClient.ts
└── MessageHandlers.ts
```

## Tasks

- [ ] Connect to Colyseus
- [ ] Join room
- [ ] Receive state
- [ ] Subscribe to player changes
- [ ] Subscribe to enemy changes
- [ ] Subscribe to weapon changes
- [ ] Subscribe to boss changes
- [ ] Handle wave events
- [ ] Handle player death
- [ ] Handle player respawn
- [ ] Handle victory
- [ ] Handle disconnect
- [ ] Handle reconnect
- [ ] Keep network code separated from rendering components

## Client/server separation

Client sends:

```text
PLAYER_MOVE
PLAYER_ATTACK
PLAYER_DODGE
PLAYER_BLOCK
PLAYER_PICKUP
PLAYER_THROW
```

Client never sends:

```text
"my position is X"
"my health is 100"
"enemy is dead"
"boss health is 0"
"damage = 9999"
```

Those remain server-authoritative.

---

# 16. PHASE 13 — EFFECTS SYSTEM

## Goal

Make the game feel impactful.

Create:

```text
effects/
├── HitEffect.tsx
├── KnockbackEffect.tsx
└── WeaponTrail.tsx
```

## Tasks

- [ ] Hit sparks
- [ ] Impact flash
- [ ] Dust
- [ ] Shockwave
- [ ] Weapon trail
- [ ] Knockback effect
- [ ] Death effect
- [ ] Damage feedback
- [ ] Screen shake
- [ ] Lightning flash
- [ ] Rain impact
- [ ] Boss phase effect
- [ ] Boss death effect

## Performance rules

- [ ] Reuse effects where possible
- [ ] Avoid unbounded particle creation
- [ ] Clean up temporary objects
- [ ] Avoid per-frame allocations
- [ ] Profile GPU usage
- [ ] Profile draw calls
- [ ] Check memory after long matches

---

# 17. PHASE 14 — PERFORMANCE PASS

## Goal

Maintain smooth browser gameplay.

Tasks:

- [ ] Test player count 1
- [ ] Test player count 2
- [ ] Test player count 3
- [ ] Test player count 4
- [ ] Test large enemy counts
- [ ] Test boss
- [ ] Test rain + lightning
- [ ] Test particles + audio together
- [ ] Test lower-end hardware if available

## Optimize

- [ ] GLB sizes
- [ ] Texture sizes
- [ ] Draw calls
- [ ] Particle count
- [ ] Shadow usage
- [ ] React re-renders
- [ ] Zustand subscriptions
- [ ] Network update handling
- [ ] Object allocation
- [ ] Animation update cost

---

# 18. PHASE 15 — INTEGRATION WITH MEMBER 3

Member 3 owns UI/HUD.

Member 2 provides the game-world values and render events they need.

Integration tasks:

- [ ] Connect Lobby → game scene
- [ ] Connect HUD player health to game state
- [ ] Connect wave count to world
- [ ] Connect enemy count to world
- [ ] Connect boss state to boss presentation
- [ ] Connect victory event to results screen
- [ ] Connect player death to visual state
- [ ] Connect weapon state to HUD
- [ ] Connect audio settings to UI settings

Do not duplicate state in multiple places unnecessarily.

---

# 19. PHASE 16 — MULTIPLAYER PLAYTEST

## Test with real clients

Minimum:

- [ ] 1 client
- [ ] 2 clients
- [ ] 3 clients
- [ ] 4 clients

## Test

- [ ] All players visible
- [ ] Player colors correct
- [ ] Players move smoothly
- [ ] Camera frames all players
- [ ] Remote player movement is smooth
- [ ] Attack animations synchronize
- [ ] Enemies appear consistently
- [ ] Enemy reactions synchronize
- [ ] Weapon pickups synchronize
- [ ] Boss state synchronizes
- [ ] Wave transitions synchronize
- [ ] Victory synchronizes

---

# 20. PHASE 17 — LATENCY / RECONCILIATION TESTING

The game uses movement prediction and server confirmation.

Test:

- [ ] Low latency
- [ ] Medium latency
- [ ] High latency
- [ ] Packet delay
- [ ] Temporary connection interruption
- [ ] Reconnection

Verify:

- [ ] Local movement remains responsive
- [ ] Server corrections are smooth
- [ ] No uncontrolled teleporting
- [ ] Remote players remain readable
- [ ] Combat effects use confirmed server results
- [ ] No client-generated false damage

---

# 21. PHASE 18 — VERTICAL SLICE INTEGRATION

The vertical slice is complete when the following visual/client experience is playable:

- [ ] 2–4 players connect
- [ ] Lobby works with Member 3
- [ ] Storm Rooftop loads
- [ ] Player colors work
- [ ] Player movement works
- [ ] Client prediction works
- [ ] Fist light attack animation works
- [ ] Fist heavy attack animation works
- [ ] 5 weapon visuals work
- [ ] 3 enemy visual types work
- [ ] Elite enemy visual works
- [ ] Five-wave flow displays correctly
- [ ] Boss model loads
- [ ] Boss animations work
- [ ] Boss phase visuals work
- [ ] Enraged visuals work
- [ ] Boss death visual works
- [ ] Screen shake works
- [ ] Hit effects work
- [ ] Audio works
- [ ] Victory presentation works

The project specification defines the vertical slice around 2–4 players, one arena, fist combat, five weapons, enemy types, five waves, boss, victory/XP, networking, lag compensation, and effects.

---

# 22. PHASE 19 — PRODUCTION CLIENT CHECKLIST

Before launch:

- [ ] Remove development debug visuals
- [ ] Remove unused assets
- [ ] Verify all GLBs load
- [ ] Verify all audio loads
- [ ] Verify all animation names
- [ ] Verify mobile/responsive UI integration
- [ ] Verify browser compatibility
- [ ] Verify asset loading failures are handled
- [ ] Verify disconnect visuals
- [ ] Verify reconnect visuals
- [ ] Verify loading states
- [ ] Verify no console errors
- [ ] Verify no memory leaks
- [ ] Verify acceptable FPS
- [ ] Verify compressed assets
- [ ] Verify production asset paths

---

# 23. GIT OWNERSHIP

Recommended branches:

```text
main
develop

feature/member2-player
feature/member2-camera
feature/member2-combat-vfx
feature/member2-enemies
feature/member2-boss
feature/member2-assets
feature/member2-audio
```

Rules:

- [ ] Do not push directly to `main`
- [ ] Use feature branches
- [ ] Keep commits focused
- [ ] Open pull requests
- [ ] Rebase/merge from current `develop` before integration when appropriate
- [ ] Test before requesting review
- [ ] Do not modify Member 1's server logic without discussion
- [ ] Do not modify shared contracts casually
- [ ] Tell Member 1 before changing assumptions about server state

---

# 24. SHARED FILE RULES

Potentially shared files:

```text
shared/schemas/GameState.ts
shared/types/index.ts
shared/messages/index.ts
shared/constants/*
```

Rules:

- [ ] Read contracts before implementing against them
- [ ] Do not invent message names
- [ ] Do not invent state fields
- [ ] Do not change authoritative semantics in the client
- [ ] Ask for contract changes through the Tech Lead
- [ ] Update client code when a contract officially changes
- [ ] Keep visual logic separate from authoritative gameplay logic

---

# 25. DEFINITION OF DONE — MEMBER 2

A Member 2 task is DONE only when:

- [ ] Code is implemented
- [ ] TypeScript passes
- [ ] No runtime console errors
- [ ] Feature works with placeholder/server state
- [ ] Feature works with multiplayer state when applicable
- [ ] Assets are correctly placed
- [ ] Temporary resources are cleaned up
- [ ] Performance is acceptable
- [ ] Feature branch is pushed
- [ ] Pull request created
- [ ] Integration tested
- [ ] Tech Lead integration issues resolved

---

# 26. WHAT MEMBER 2 CAN DO WITHOUT WAITING

Member 2 can work independently on:

```text
✅ R3F scene
✅ Three.js lighting
✅ Arena placeholders
✅ Player model
✅ Player animation controller
✅ Camera
✅ Client physics
✅ Local movement
✅ Effects
✅ Weapon visuals
✅ Enemy models
✅ Boss asset preparation
✅ Audio manager
✅ Rain
✅ Lightning
✅ Screen shake
✅ Asset optimization
✅ Performance testing
```

Member 2 should wait for a shared contract only when the feature specifically needs server data.

---

# 27. DO NOT WAIT FOR THE WHOLE SERVER

Bad workflow:

```text
Member 1:
"Backend must be 100% complete."

Member 2:
"Okay, I'll wait."
```

Correct workflow:

```text
Member 1:
"PLAYER state + PLAYER_MOVE contract ready."

        ↓

Member 2:
Build Player + Controller + Camera

        ↓

Member 1:
Continue combat/networking

        ↓

Member 2:
Build animations + effects

        ↓

Member 3:
Build HUD + lobby

        ↓

Integration
```

This is the intended parallel-development model.

---

# 28. FINAL MEMBER 2 ROADMAP

```text
PHASE 0
Client foundation
    ↓
PHASE 1
Player controller
    ↓
PHASE 2
Group camera
    ↓
PHASE 3
Character + animation system
    ↓
PHASE 4
Combat presentation
    ↓
PHASE 5
Weapon visuals
    ↓
PHASE 6
Enemy presentation
    ↓
PHASE 7
Physics presentation
    ↓
PHASE 8
Wave + Storm Rooftop presentation
    ↓
PHASE 9
Audio
    ↓
PHASE 10
Boss asset pipeline
    ↓
PHASE 11
Boss implementation
    ↓
PHASE 12
Network client integration
    ↓
PHASE 13
Effects
    ↓
PHASE 14
Performance
    ↓
PHASE 15
UI integration
    ↓
PHASE 16
Multiplayer playtest
    ↓
PHASE 17
Latency testing
    ↓
PHASE 18
Vertical slice
    ↓
PHASE 19
Production client
```

# MEMBER 2 SUCCESS CONDITION

Member 2 is successful when:

```text
SERVER STATE
     ↓
CLIENT NETWORK
     ↓
3D WORLD
     ↓
CHARACTER
     ↓
ANIMATION
     ↓
COMBAT FEEDBACK
     ↓
CAMERA
     ↓
VFX
     ↓
AUDIO
     ↓
POLISHED MULTIPLAYER EXPERIENCE
```

The client should **never become the authority**. Its job is to make the authoritative game state feel immediate, readable, cinematic, and responsive.
