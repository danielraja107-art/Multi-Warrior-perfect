import { Router } from 'express';
import { matchMaker } from 'colyseus';

export const gameRoomRouter: Router = Router();

gameRoomRouter.get('/game-rooms/status', async (req, res) => {
  const code = String(req.query.code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) {
    return res.status(400).json({ error: { code: 'INVALID_CODE', message: 'Invalid room code.' } });
  }

  const rooms = await matchMaker.query({ name: 'game_room' });
  const matches = (Array.isArray(rooms) ? rooms : []).filter(
    (room) => (room.metadata as { code?: string } | undefined)?.code === code,
  );

  if (matches.length === 0) {
    return res.json({ found: false, rooms: [] });
  }

  return res.json({
    found: true,
    rooms: matches.map((room) => ({
      roomId: room.roomId,
      clients: room.clients,
      maxClients: room.maxClients,
      locked: room.locked,
    })),
  });
});