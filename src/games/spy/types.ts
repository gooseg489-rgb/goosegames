export type Screen = "join" | "waiting" | "role" | "game" | "result";

export type PlayerRole = {
  isSpy: boolean;
  location: string | null;
};

export type Player = {
  name: string;
  avatar?: string;
  isHost?: boolean;
  ready?: boolean;
};

export type LogEntry = { msg: string; t: number };

export type RoomState = {
  code?: string;
  status?: "waiting" | "role_reveal" | "playing" | "ended";
  timerMin?: number;
  timerEnd?: number;
  hostId?: string;
  startedAt?: number;
  votePhase?: string | null;
  voteEnd?: number;
  voteRequests?: Record<string, boolean>;
  playerVotes?: Record<string, string>;
  players?: Record<string, Player>;
  log?: Record<string, LogEntry>;
  locationsList?: string[];
  endReason?: string;
  eliminatedId?: string;
  spyGuess?: string;
  spyGuessResult?: string;
  revealedSpyId?: string;
  revealedLocation?: string;
  _spyId?: string;
  _location?: string;
};

export type SpySession = {
  roomId: string;
  myId: string;
  myName: string;
  iAmHost: boolean;
  myAvatar: string;
};
