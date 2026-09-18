# Storm Arena — Member 3 Development TODO

**Role:** Member 3 — UI / Platform / Database Lead  
**Primary Areas:** React UI, lobby, HUD, Zustand client state, authentication, REST API, PostgreSQL, Prisma, progression, match history, achievements, deployment support  
**Works With:** Member 1 (Tech Lead / Server) and Member 2 (3D Client / Gameplay Presentation)

---

# 0. ROLE RULES

Member 3 owns the UI and platform side of Storm Arena.

### Primary ownership

- [x] Main menu
- [x] Create Room UI
- [x] Join Room UI
- [x] Lobby UI
- [x] Difficulty selection UI
- [x] Host START UI
- [x] In-game HUD
- [x] Boss health bar
- [x] Wave transition UI
- [x] Results screen
- [x] XP display
- [x] Settings UI
- [x] Zustand client state
- [x] Loading/error states
- [x] Authentication
- [x] Registration
- [x] Login
- [x] JWT handling
- [x] PostgreSQL
- [x] Prisma
- [x] Profile data
- [x] Match persistence
- [x] Participant statistics
- [x] Achievements
- [x] XP/progression integration
- [x] REST API
- [x] Deployment/environment configuration
- [x] Production platform testing

### Do NOT own

- [ ] Authoritative movement
- [ ] Authoritative combat
- [ ] Hitbox validation
- [ ] Enemy AI
- [ ] WaveDirector logic
- [ ] Boss gameplay logic
- [ ] Server physics
- [ ] 3D rendering architecture
- [ ] Character animation architecture

---

# 1. GAME FLOW

The application flow is:

```text
MAIN MENU
   ↓
CREATE ROOM / JOIN ROOM
   ↓
LOBBY
   ↓
HOST START
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

Member 3's UI must represent authoritative server state and must not independently decide gameplay outcomes.

---

# 2. PHASE 0 — UI / PLATFORM FOUNDATION

## Goal

Create the UI and application foundation immediately so Member 3 can work without waiting for the complete backend.

## Project setup

- [x] Verify React + Vite
- [x] Verify TypeScript
- [x] Configure Tailwind CSS if used
- [x] Install/configure Zustand
- [x] Establish application structure

Expected client structure:

```text
client/src/
├── app/
│   ├── App.tsx
│   └── Router.tsx
├── ui/
│   ├── MainMenu.tsx
│   ├── CreateRoom.tsx
│   ├── JoinRoom.tsx
│   ├── Lobby.tsx
│   ├── HUD.tsx
│   ├── BossHealthBar.tsx
│   ├── WaveTransition.tsx
│   └── ResultsScreen.tsx
├── network/
└── state/
    └── useGameStore.ts
```

## UI foundation

- [x] Define typography
- [x] Define spacing
- [x] Define buttons
- [x] Define panels
- [x] Define progress bars
- [x] Define player-color indicators
- [x] Define modal styles
- [x] Define error states
- [x] Define loading states
- [x] Define disabled states
- [x] Define basic transitions

Visual direction:

```text
Dark
Cinematic
High contrast
Storm / industrial
Bright player-color accents
```

---

# 3. PHASE 0 HANDOFF GATE

Member 3 does NOT need the entire server to start.

Build immediately:

- [x] Static Main Menu
- [x] Create Room screen
- [x] Join Room screen
- [x] Lobby mock state
- [x] Difficulty selector
- [x] HUD mock state
- [x] Boss health bar
- [x] Wave transition
- [x] Results screen
- [x] Zustand foundation
- [x] Loading/error components
- [x] Login page layout
- [x] Registration page layout

### Required shared contracts later

From Member 1:

- [x] Game phase
- [x] Player state
- [x] Player health
- [x] Player weapon
- [x] Wave
- [x] Enemy count
- [x] Boss state
- [x] Connection state
- [x] Game events

Do NOT wait for:

- [ ] Combat
- [ ] Enemy AI
- [ ] Boss AI
- [ ] Final 3D assets
- [ ] Full physics implementation

---

# 4. PHASE 1 — APPLICATION NAVIGATION

## Goal

Make the application flow correctly between screens.

Tasks:

- [x] Main menu route
- [x] Create Room route
- [x] Join Room route
- [x] Lobby route
- [x] Game route
- [x] Results route
- [x] Settings route
- [x] Authentication route(s)
- [x] Protected routes where needed
- [x] Invalid-route handling
- [x] Loading route/state
- [x] Connection-failure handling
- [x] Prevent accidental navigation during active match

Expected flow:

```text
Main Menu
   ├── Create Room → Lobby
   └── Join Room   → Lobby

Lobby
   ↓
Game

Game
   ↓
Results
```

---

# 5. PHASE 2 — MAIN MENU

## Goal

Implement the documented Main Menu.

```text
╔═══════════════════════╗
║     STORM ARENA       ║
╠═══════════════════════╣
║                       ║
║ [ PLAY WITH FRIENDS ] ║
║                       ║
║ [ CREATE ROOM ]       ║
║                       ║
║ [ JOIN ROOM ]         ║
║                       ║
║ [ SETTINGS ]          ║
║                       ║
╚═══════════════════════╝
```

Tasks:

- [x] Build MainMenu
- [x] Add game title/logo
- [x] Create Room button
- [x] Join Room button
- [x] Play With Friends flow
- [x] Settings button
- [x] Loading state
- [x] Disabled state
- [x] Keyboard accessibility
- [x] Responsive layout
- [x] Screen transitions

---

# 6. PHASE 3 — CREATE / JOIN ROOM

## Create Room

- [x] CreateRoom UI
- [x] Create-room request
- [x] Loading state
- [x] Error state
- [x] Receive room code
- [x] Navigate to Lobby
- [x] Display room code
- [x] Copy room code

## Join Room

- [x] JoinRoom UI
- [x] Room-code input
- [x] Input validation
- [x] Join request
- [x] Loading state
- [x] Invalid room error
- [x] Room full error
- [x] Connection error
- [x] Navigate to Lobby

---

# 7. PHASE 4 — LOBBY

## Goal

Implement the 2–4 player lobby.

```text
ROOM: A7X29K

🔴 Player 1 (Host)
🔵 Player 2
🟢 Player 3
🟡 Waiting...

DIFFICULTY:
[ EASY ] [ NORMAL ] [ HARD ]

[ START GAME ]
```

Tasks:

- [x] Display room code
- [x] Copy room code
- [x] Display player slots
- [x] Display player color
- [x] Display player name
- [x] Display host status
- [x] Display empty slots
- [x] Show joining state
- [x] Show leaving state
- [x] Difficulty selector
- [x] EASY
- [x] NORMAL
- [x] HARD
- [x] Host-only START button
- [x] Disable START when invalid
- [x] Show starting state
- [x] Handle room errors
- [x] Handle reconnection UI
- [x] Handle room destruction

The UI must consume server state rather than create independent lobby truth.

---

# 8. PHASE 5 — ZUSTAND STATE

Create:

```text
client/src/state/useGameStore.ts
```

## Goal

Organize client/UI state without duplicating authoritative game state unnecessarily.

Suggested categories:

```text
connection
room
localPlayerId
ui
loading
errors
settings
auth
profile
```

Tasks:

- [x] Define store shape
- [x] Connection state
- [x] Current room
- [x] Local player ID
- [x] UI state
- [x] Loading state
- [x] Error state
- [x] Settings state
- [x] Authentication state
- [x] Profile state
- [x] Network event integration
- [x] Small selectors
- [x] Prevent unnecessary re-renders

---

# 9. PHASE 6 — IN-GAME HUD

## Goal

Create the documented HUD.

Tasks:

- [x] Create `HUD.tsx`
- [x] Player 1 health bar
- [x] Player 2 health bar
- [x] Player 3 health bar
- [x] Player 4 health bar
- [x] Player color identity
- [x] Wave number
- [x] Enemy remaining count
- [x] Current weapon indicator where required
- [x] Local player emphasis
- [x] Low-health feedback
- [x] Death state
- [x] Respawn state
- [x] Connection indicator where useful

Do not calculate authoritative health locally.

---

# 10. PHASE 7 — BOSS HEALTH BAR

Create:

```text
BossHealthBar.tsx
```

Tasks:

- [x] Boss title
- [x] Boss health bar
- [x] Health percentage
- [x] Phase indicator where useful
- [x] Phase transition notification
- [x] Enraged notification
- [x] Boss defeated state
- [x] Smooth UI interpolation
- [x] Consume authoritative server values

Example:

```text
⚠ FINAL BOSS

██████████████████████████░░░░░░
75%
```

---

# 11. PHASE 8 — WAVE TRANSITIONS

Create:

```text
WaveTransition.tsx
```

Tasks:

- [x] Wave number
- [x] WAVE COMPLETE display
- [x] XP reward
- [x] Rest-period timer
- [x] Weapon respawn message
- [x] Next wave announcement
- [x] Boss announcement
- [x] Smooth transitions
- [x] Consume server events
- [x] Never advance the wave from UI logic

Example:

```text
WAVE 3
COMPLETE!

+50 XP per player

Weapons respawn in 10s
```

---

# 12. PHASE 9 — RESULTS SCREEN

Create:

```text
ResultsScreen.tsx
```

Tasks:

- [x] Victory state
- [x] Defeat/game-over state
- [x] Match duration
- [x] Waves cleared
- [x] Boss defeated
- [x] Player kills
- [x] Player damage
- [x] Player deaths
- [x] XP earned
- [x] Return to main menu
- [x] Profile navigation
- [x] Handle incomplete data
- [x] Prevent duplicate result submission

Final statistics must come from the authoritative match result.

---

# 13. PHASE 10 — SETTINGS

Tasks:

- [x] Settings screen
- [x] Music volume
- [x] SFX volume
- [x] General audio volume
- [x] Controls information
- [x] Graphics settings if implemented
- [x] Save client preferences
- [x] Restore preferences
- [x] Reset defaults

Coordinate with Member 2 so audio settings affect `AudioManager`.

---

# 14. PHASE 11 — LOADING / ERROR SYSTEM

Create reusable UI for:

- [x] Loading
- [x] Connecting
- [x] Connected
- [x] Disconnected
- [x] Reconnecting
- [x] Room not found
- [x] Room full
- [x] Authentication failure
- [x] Server error
- [x] Network timeout
- [x] Invalid input
- [x] Unexpected game state

Use consistent styling.

---

# 15. PHASE 12 — AUTHENTICATION

Create:

```text
server/auth/
├── AuthRouter.ts
└── AuthService.ts
```

## Registration

- [x] Registration endpoint
- [x] Validate email
- [x] Validate username
- [x] Validate password
- [x] Hash password
- [x] Create User
- [x] Handle duplicate email
- [x] Handle duplicate username

## Login

- [x] Login endpoint
- [x] Verify credentials
- [x] Create JWT
- [x] Return safe user information
- [x] Handle invalid credentials

## Authentication

- [x] JWT verification
- [x] Authentication middleware
- [x] Protected endpoints
- [x] Logout handling
- [x] Expired token handling
- [x] Unauthorized handling

Never expose password hashes to the client.

---

# 16. PHASE 13 — DATABASE FOUNDATION

## Goal

Set up PostgreSQL + Prisma.

Create:

```text
database/
└── prisma/
    ├── schema.prisma
    └── migrations/
```

Tasks:

- [x] Create PostgreSQL database
- [x] Configure `DATABASE_URL`
- [x] Initialize Prisma
- [x] Create schema
- [x] Create initial migration
- [x] Run migration
- [x] Generate Prisma client
- [x] Create development seed strategy
- [x] Document local database setup
- [x] Document production database setup

Required models:

```text
User
Profile
Match
MatchParticipant
Achievement
```

---

# 17. PHASE 14 — USER / PROFILE DATA

## User

- [x] User creation
- [x] User lookup
- [x] Unique email
- [x] Unique username
- [x] Password hash
- [x] createdAt
- [x] updatedAt

## Profile

Implement:

- [x] level
- [x] XP
- [x] coins
- [x] wins
- [x] losses
- [x] totalKills
- [x] totalDamage
- [x] avatar
- [x] updatedAt

## Profile services

- [x] Get profile
- [x] Update profile where required
- [x] Update XP
- [x] Update wins
- [x] Update losses
- [x] Update kills
- [x] Update damage

---

# 18. PHASE 15 — MATCH PERSISTENCE

## Goal

Persist completed matches.

The active match state remains in server memory; persistent match data is written when the match ends.

Persist:

```text
Match
MatchParticipant[]
```

Tasks:

- [x] Save roomCode
- [x] Save arena
- [x] Save difficulty
- [x] Save wavesCleared
- [x] Save bossDefeated
- [x] Save duration
- [x] Save participants
- [x] Save kills
- [x] Save damage
- [x] Save deaths
- [x] Save XP earned
- [x] Handle database failures
- [x] Prevent duplicate match saves
- [x] Use transactions where appropriate

Do NOT persist active positions or active enemy state every game tick.

---

# 19. PHASE 16 — XP / PROGRESSION

Use the documented formula:

```text
xpEarned =
    (kills * 10)
  + (damageDealt / 10)
  + (wavesCleared * 50)
  + (bossDefeated ? 200 : 0)
```

Tasks:

- [x] Implement XP calculation
- [x] Receive final match stats
- [x] Calculate XP on server side
- [x] Update profile
- [x] Handle level progression
- [x] Display XP reward
- [x] Prevent client-submitted XP

---

# 20. PHASE 17 — ACHIEVEMENTS

Initial documented examples:

```text
first_win
boss_slayer
100_kills
```

Tasks:

- [x] Achievement model
- [x] Achievement checking
- [x] Unlock logic
- [x] Duplicate prevention
- [x] Unlock timestamp
- [x] Achievement retrieval
- [x] Achievement display

Never allow the browser to directly unlock an achievement.

---

# 21. PHASE 18 — REST API

REST is for persistent/platform functionality, not the real-time game simulation.

Tasks:

- [x] Auth routes
- [x] Profile routes
- [x] Match history routes
- [x] Achievement routes
- [x] JWT middleware
- [x] Input validation
- [x] HTTP error handling
- [x] Rate limiting
- [x] CORS configuration
- [x] Logging
- [x] Environment-specific configuration

---

# 22. PHASE 19 — PROFILE / MATCH HISTORY UI

## Profile

- [x] Username
- [x] Level
- [x] XP
- [x] Wins
- [x] Losses
- [x] Total kills
- [x] Total damage
- [x] Achievements
- [x] Avatar where implemented

## Match history

- [x] Match date
- [x] Arena
- [x] Difficulty
- [x] Waves cleared
- [x] Boss result
- [x] Match duration
- [x] Player kills
- [x] Player damage
- [x] Player deaths
- [x] XP earned

---

# 23. PHASE 20 — MEMBER 1 INTEGRATION

Connect the UI to authoritative server events/state.

Tasks:

- [ ] Lobby player updates
- [ ] Difficulty updates
- [ ] Host state
- [ ] Game-start event
- [ ] Wave-start event
- [ ] Wave-complete event
- [ ] Boss phase event
- [ ] Boss enraged event
- [ ] Player-death event
- [ ] Player-respawn event
- [ ] Game-victory event
- [ ] Game-over event
- [ ] Reconnection state

Server event names documented by the project:

```text
WAVE_START
WAVE_COMPLETE
BOSS_PHASE_CHANGE
BOSS_ENRAGED
BOSS_DEAD
PLAYER_DIED
PLAYER_RESPAWNED
GAME_VICTORY
GAME_OVER
```

UI must react to these events and must not replace them with client-side game decisions.

---

# 24. PHASE 21 — MEMBER 2 INTEGRATION

Coordinate with the 3D client.

Tasks:

- [ ] HUD overlays correctly on game canvas
- [ ] BossHealthBar follows boss lifecycle
- [ ] WaveTransition matches world events
- [ ] Results waits for match completion
- [ ] Audio settings affect AudioManager
- [ ] Player color UI matches 3D player color
- [ ] Health UI matches character state
- [ ] Death UI matches 3D death state
- [ ] Weapon indicator matches held weapon
- [ ] Loading UI supports large asset loading

---

# 25. PHASE 22 — SECURITY / VALIDATION

Never trust the browser.

Tasks:

- [x] Validate registration
- [x] Validate login
- [x] Validate room codes
- [x] Validate API request bodies
- [x] Validate JWT
- [x] Verify authenticated ownership
- [x] Protect profile update APIs
- [x] Prevent client-submitted XP
- [x] Prevent client-submitted match results
- [x] Prevent achievement spoofing
- [x] Rate-limit authentication endpoints
- [x] Secure environment secrets
- [x] Do not log passwords/tokens
- [x] Use safe production errors

Member 1 handles gameplay input validation and gameplay anti-cheat.

---

# 26. PHASE 23 — DEPLOYMENT FOUNDATION

Documented deployment options:

```text
Frontend:
Vercel or Cloudflare Pages

Game Server:
Railway or DigitalOcean

PostgreSQL:
Supabase or Neon

Redis:
Upstash (later)
```

Tasks:

- [x] Create production frontend
- [x] Create production game server
- [x] Create production PostgreSQL
- [x] Configure environment variables
- [x] Configure frontend API URL
- [x] Configure WebSocket URL
- [x] Configure game-server URL
- [x] Configure `DATABASE_URL`
- [x] Configure JWT secret
- [x] Configure CORS
- [ ] Verify HTTPS
- [ ] Verify secure WebSocket
- [x] Verify production build
- [x] Verify database migrations

Redis must not block v1.

---

# 27. PHASE 24 — ERROR LOGGING / MONITORING

Tasks:

- [ ] Client error boundary
- [ ] Client error logging
- [ ] Server logging
- [ ] Database error logging
- [ ] Auth error logging
- [ ] Network error reporting
- [ ] Safe production error messages
- [ ] Health endpoint where appropriate
- [ ] Server crash visibility
- [ ] Database connection monitoring

---

# 28. PHASE 25 — PLATFORM PERFORMANCE

Tasks:

- [ ] Check initial page load
- [ ] Check UI bundle size
- [ ] Avoid excessive React renders
- [ ] Avoid excessive Zustand subscriptions
- [ ] Verify HUD performance during combat
- [ ] Verify API response performance
- [ ] Verify database query performance
- [ ] Add indexes where justified
- [ ] Avoid excessive API calls

Coordinate with Member 2 for 3D performance rather than duplicating rendering optimization.

---

# 29. PHASE 26 — MULTIPLAYER UI TESTING

Test:

- [ ] 1 player
- [ ] 2 players
- [ ] 3 players
- [ ] 4 players

Verify:

- [ ] Lobby updates
- [ ] Player colors
- [ ] Host indicator
- [ ] Difficulty
- [ ] Start state
- [ ] Wave number
- [ ] Enemy count
- [ ] Health UI
- [ ] Boss health
- [ ] Death state
- [ ] Respawn state
- [ ] Victory
- [ ] Results data

---

# 30. PHASE 27 — RECONNECTION UI TESTING

The project specifies a 30-second reconnection window.

Test:

- [ ] Disconnect in lobby
- [ ] Disconnect during wave
- [ ] Disconnect during combat
- [ ] Disconnect during boss
- [ ] Reconnect within 30 seconds
- [ ] Reconnect after 30 seconds
- [ ] Correct reconnect UI
- [ ] Correct room/game screen
- [ ] Room destroyed handling
- [ ] Remaining-player continuation

Do not create fake client-only recovery state.

---

# 31. PHASE 28 — VERTICAL SLICE

Member 3 must provide:

- [ ] Main menu
- [ ] Create room
- [ ] Join room
- [ ] Lobby
- [ ] Difficulty selection
- [ ] Host START
- [ ] HUD
- [ ] Player health
- [ ] Wave number
- [ ] Enemy count
- [ ] Boss bar
- [ ] Wave transition
- [ ] Victory screen
- [ ] XP display
- [ ] Basic authentication
- [ ] Match persistence
- [ ] Production test environment

The vertical slice must work with Member 1's authoritative multiplayer/gameplay and Member 2's 3D client.

---

# 32. PHASE 29 — PRODUCTION READINESS

Before launch:

- [x] Environment variables documented
- [x] Secrets not committed
- [x] Production database configured
- [x] Prisma migrations verified
- [x] Registration tested
- [x] Login tested
- [x] JWT handling tested
- [x] REST rate limiting enabled
- [x] Input validation enabled
- [x] Error boundaries enabled
- [x] Server error logging enabled
- [x] Database failures handled
- [ ] HTTPS verified
- [ ] Secure WebSocket verified
- [ ] Frontend deployment verified
- [ ] Game server deployment verified
- [x] Match persistence verified
- [x] XP verified
- [x] Achievements verified
- [x] Match history verified
- [x] No sensitive data in logs
- [x] No development secrets in repository

---

# 33. GIT OWNERSHIP

Recommended branches:

```text
feature/member3-main-menu
feature/member3-lobby
feature/member3-hud
feature/member3-results
feature/member3-auth
feature/member3-database
feature/member3-profile
feature/member3-progression
feature/member3-api
feature/member3-deployment
```

Rules:

- [ ] Never push directly to `main`
- [ ] Use feature branches
- [ ] Keep commits focused
- [ ] Open pull requests
- [ ] Test before review
- [ ] Do not rewrite Member 1's gameplay logic
- [ ] Do not rewrite Member 2's 3D architecture
- [ ] Coordinate shared contract changes with Member 1
- [ ] Keep database migrations reviewed carefully

---

# 34. SHARED FILE RULES

Potential shared files:

```text
shared/schemas/GameState.ts
shared/types/index.ts
shared/messages/index.ts
shared/constants/*
```

Rules:

- [ ] Read contract before consuming it
- [ ] Do not invent state fields
- [ ] Do not invent server events
- [ ] Do not make UI authoritative
- [ ] Do not calculate gameplay outcomes that belong to the server
- [ ] Request contract changes through Member 1
- [ ] Update UI after approved contract changes
- [ ] Keep persistence separate from active game state

---

# 35. DEFINITION OF DONE — MEMBER 3

A Member 3 task is DONE only when:

- [ ] Feature implemented
- [ ] TypeScript passes
- [ ] No runtime console errors
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Responsive behavior checked where applicable
- [ ] API integration tested where applicable
- [ ] Database integration tested where applicable
- [ ] Authentication/security checked where applicable
- [ ] Real server data tested where applicable
- [ ] Git branch pushed
- [ ] Pull request created
- [ ] Review completed
- [ ] Integration tested

---

# 36. WHAT MEMBER 3 CAN DO WITHOUT WAITING

Immediately build:

```text
✅ Main Menu
✅ Create Room screen
✅ Join Room screen
✅ Lobby UI
✅ Difficulty selector
✅ HUD
✅ Boss bar
✅ Wave transition
✅ Results screen
✅ Settings
✅ Zustand foundation
✅ Loading states
✅ Error states
✅ Login UI
✅ Registration UI
✅ Profile UI
✅ Match-history UI
✅ Achievement UI
✅ Prisma schema
✅ PostgreSQL setup
✅ REST API foundation
✅ Deployment configuration
```

Only features that consume authoritative gameplay data need the corresponding shared contract.

---

# 37. PARALLEL DEVELOPMENT RULE

Bad:

```text
Member 1:
"Backend must be 100% complete."

Member 3:
"Okay, I'll wait."
```

Correct:

```text
Member 1:
"Player + room + wave contracts ready."
        ↓
Member 3:
Build Lobby + HUD
        ↓
Member 1:
Continue combat + AI
        ↓
Member 3:
Continue Auth + Database
        ↓
Member 2:
Continue 3D + Effects
        ↓
Integration
```

---

# 38. FINAL MEMBER 3 ROADMAP

```text
PHASE 0
UI / Platform Foundation
        ↓
PHASE 1
Application Navigation
        ↓
PHASE 2
Main Menu
        ↓
PHASE 3
Create / Join Room
        ↓
PHASE 4
Lobby
        ↓
PHASE 5
Zustand State
        ↓
PHASE 6
HUD
        ↓
PHASE 7
Boss Health Bar
        ↓
PHASE 8
Wave Transitions
        ↓
PHASE 9
Results
        ↓
PHASE 10
Settings
        ↓
PHASE 11
Loading / Errors
        ↓
PHASE 12
Authentication
        ↓
PHASE 13
Database
        ↓
PHASE 14
User / Profile
        ↓
PHASE 15
Match Persistence
        ↓
PHASE 16
XP / Progression
        ↓
PHASE 17
Achievements
        ↓
PHASE 18
REST API
        ↓
PHASE 19
Profile / History
        ↓
PHASE 20
Member 1 Integration
        ↓
PHASE 21
Member 2 Integration
        ↓
PHASE 22
Security / Validation
        ↓
PHASE 23
Deployment
        ↓
PHASE 24
Logging / Monitoring
        ↓
PHASE 25
Performance
        ↓
PHASE 26
Multiplayer UI Testing
        ↓
PHASE 27
Reconnection Testing
        ↓
PHASE 28
Vertical Slice
        ↓
PHASE 29
Production Readiness
```

# MEMBER 3 SUCCESS CONDITION

```text
PLAYER
   ↓
MAIN MENU
   ↓
ROOM
   ↓
LOBBY
   ↓
GAME HUD
   ↓
WAVES
   ↓
BOSS
   ↓
VICTORY
   ↓
RESULTS
   ↓
XP
   ↓
PROFILE
   ↓
MATCH HISTORY
   ↓
ACHIEVEMENTS
```

Member 3's platform must reliably connect the player-facing application, persistent account data, and authoritative multiplayer game without making the UI itself authoritative.

---

# TEAM COORDINATION

```text
              STORM ARENA
                   │
       ┌───────────┼───────────┐
       │           │           │
   MEMBER 1    MEMBER 2    MEMBER 3
   TECH LEAD     3D        UI/PLATFORM
       │        CLIENT          │
       │           │            │
   Server       Rendering    UI/API/DB
   Combat       Animation    Auth
   AI           Camera       Progression
   Waves        Physics      Persistence
   Boss         Effects      Deployment
   Network      Assets
       │           │            │
       └───────────┼────────────┘
                   │
              INTEGRATION
                   │
                PLAYTEST
                   │
             VERTICAL SLICE
```
