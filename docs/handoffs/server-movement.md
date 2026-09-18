# Member 1 → Member 2 Handoff: Server-Authoritative Movement

Contract version: 0.1.0

## Message: `PLAYER_MOVE` (client → server)

Sent on every input change / simulation frame (recommended: at most once per client tick).

```json
{
  "direction": { "x": 1, "y": 0, "z": 0 },
  "rotation":  { "x": 0.0, "y": -1.57 },
  "timestamp": 1789000000000
}
```

Server-side fields handled automatically:
- `rotation` is optional. Include the yaw (y) so the avatar faces the movement direction.
- `timestamp` is the client millisecond epoch for input ordering. Out-of-order/duplicate timestamps are rejected.

## Server validation (rejects invalid input silently)

- Player must exist and be alive.
- `direction` must be a finite 3D vector.
- Direction magnitude must be `<= 1.01` (server normalizes/keeps as-is).
- Timestamp must be a finite number and strictly newer than the last accepted input.

Server never accepts client position as truth — only direction + rotation are accepted.

## Server authority

- Position is integrated on the server only (20 Hz simulation tick).
- Player speed: `5.0` units/second.
- World boundary: clamped to `[-20, 20]` on all 3 axes.

## Server → client state (authoritative)

Synced via the `GameState` schema:

| Field | Type | Notes |
|---|---|---|
| `players.{id}.position` | Vector3 | authoritative position |
| `players.{id}.rotation` | Vector3 | authoritative rotation |
| `players.{id}.state` | string | `running` \| `idle` (movement) |
| `players.{id}.isAlive` | boolean | dead players do not move |

## Client rendering recommendation

1. Send `PLAYER_MOVE` with local prediction on input.
2. Render the local predicted position immediately.
3. On state sync, reconcile the predicted position toward the authoritative `position` (lerp over ~50–100 ms).
4. Ignore client-authoritative corrections; the server wins.

## Example

Input:
```json
{ "direction": { "x": 1, "y": 0, "z": 0 }, "timestamp": 100 }
```

Server result:
- position advances ~5 units/sec in +x.
- `state` becomes `running` while input is nonzero, `idle` on zero input.
