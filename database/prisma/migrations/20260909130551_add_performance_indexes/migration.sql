-- CreateIndex
CREATE INDEX "Match_roomCode_idx" ON "Match"("roomCode");

-- CreateIndex
CREATE INDEX "Match_createdAt_idx" ON "Match"("createdAt");

-- CreateIndex
CREATE INDEX "MatchParticipant_userId_idx" ON "MatchParticipant"("userId");
