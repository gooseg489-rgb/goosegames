import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  get,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  type DatabaseReference,
  type Unsubscribe,
} from "firebase/database";
import { db } from "../../firebase";
import { AVATARS, LOCATIONS, SESSION_KEY } from "./constants";
import type { Player, PlayerRole, RoomState, Screen, SpySession } from "./types";

function ts() {
  return Date.now();
}

function randomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadSession(): SpySession | null {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? (JSON.parse(s) as SpySession) : null;
  } catch {
    return null;
  }
}

function saveSession(data: SpySession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function useSpyRoom() {
  const [searchParams] = useSearchParams();
  const urlRoomCode = (searchParams.get("room") || "").toUpperCase();

  const [screen, setScreen] = useState<Screen>("join");
  const [joinMode, setJoinMode] = useState<"normal" | "quick">(
    urlRoomCode ? "quick" : "normal",
  );
  const [joinError, setJoinError] = useState("");
  const [name, setName] = useState("");
  const [quickName, setQuickName] = useState("");
  const [myAvatar, setMyAvatar] = useState(AVATARS[0]);
  const [roomState, setRoomState] = useState<RoomState>({});
  const [timerDisplay, setTimerDisplay] = useState("08:00");
  const [timerFill, setTimerFill] = useState("100%");
  const [timerUrgent, setTimerUrgent] = useState(false);
  const [votePhaseTimer, setVotePhaseTimer] = useState("01:00");
  const [votePhaseSub, setVotePhaseSub] = useState("Выбери подозреваемого");
  const [modalVoteOpen, setModalVoteOpen] = useState(false);
  const [modalGuessOpen, setModalGuessOpen] = useState(false);
  const [dictMode, setDictMode] = useState<"default" | "custom">("default");
  const [customLocationsText, setCustomLocationsText] = useState("");
  const [copyHint, setCopyHint] = useState("");
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [iAmSpy, setIAmSpy] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState("");

  const myIdRef = useRef<string | null>(null);
  const roomIdRef = useRef("");
  const myNameRef = useRef("");
  const iAmHostRef = useRef(false);
  const iAmSpyRef = useRef(false);
  const myRoleRef = useRef<PlayerRole | null>(null);
  const currentRoundIdRef = useRef<number | null>(null);
  const roleShownRef = useRef(false);
  const resultShownRef = useRef(false);
  const myVoteRequestSentRef = useRef(false);
  const votePhaseRenderedRef = useRef(false);
  const hostLocationRef = useRef("");
  const hostSpyIdRef = useRef("");
  const customLocationsRef = useRef<string[]>([]);
  const lastTimerEndRef = useRef<number | null>(null);

  const roomRefObj = useRef<DatabaseReference | null>(null);
  const privateRefObj = useRef<DatabaseReference | null>(null);
  const unsubRoom = useRef<Unsubscribe | null>(null);
  const unsubPrivate = useRef<Unsubscribe | null>(null);
  const unsubSpyGuess = useRef<Unsubscribe | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const votePhaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const initDoneRef = useRef(false);
  const watchSpyGuessRef = useRef<(roomId: string) => void>(() => {});

  const getActiveLocations = useCallback(() => {
    if (dictMode === "custom" && customLocationsRef.current.length > 0) {
      return customLocationsRef.current;
    }
    return LOCATIONS;
  }, [dictMode]);

  const showError = useCallback((msg: string) => {
    setJoinError(msg);
    setTimeout(() => setJoinError(""), 4000);
  }, []);

  const resetRoundState = useCallback(() => {
    iAmSpyRef.current = false;
    myRoleRef.current = null;
    setMyRole(null);
    setIAmSpy(false);
    roleShownRef.current = false;
    resultShownRef.current = false;
    myVoteRequestSentRef.current = false;
    votePhaseRenderedRef.current = false;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (votePhaseIntervalRef.current) clearInterval(votePhaseIntervalRef.current);
    setModalVoteOpen(false);
    setModalGuessOpen(false);
    lastTimerEndRef.current = null;
  }, []);

  const addLog = useCallback(async (msg: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    await push(ref(db, `rooms/${roomId}/log`), { msg, t: ts() });
  }, []);

  const persistSession = useCallback(() => {
    if (!myIdRef.current || !roomIdRef.current) return;
    saveSession({
      roomId: roomIdRef.current,
      myId: myIdRef.current,
      myName: myNameRef.current,
      iAmHost: iAmHostRef.current,
      myAvatar,
    });
  }, [myAvatar]);

  const unsubscribeAll = useCallback(() => {
    if (unsubRoom.current) {
      unsubRoom.current();
      unsubRoom.current = null;
    }
    if (unsubPrivate.current) {
      unsubPrivate.current();
      unsubPrivate.current = null;
    }
    if (unsubSpyGuess.current) {
      unsubSpyGuess.current();
      unsubSpyGuess.current = null;
    }
    roomRefObj.current = null;
    privateRefObj.current = null;
  }, []);

  const backToJoin = useCallback(() => {
    unsubscribeAll();
    clearSession();
    myIdRef.current = null;
    roomIdRef.current = "";
    setMyId(null);
    setRoomId("");
    iAmHostRef.current = false;
    setMyRole(null);
    setIAmSpy(false);
    resetRoundState();
    setRoomState({});
    setScreen("join");
    setJoinMode(urlRoomCode ? "quick" : "normal");
  }, [resetRoundState, unsubscribeAll, urlRoomCode]);

  const handleStateChange = useCallback(
    (state: RoomState) => {
      if (state.startedAt && state.startedAt !== currentRoundIdRef.current) {
        currentRoundIdRef.current = state.startedAt;
        resetRoundState();
      }

      switch (state.status) {
        case "waiting":
          setScreen("waiting");
          break;
        case "role_reveal":
          break;
        case "playing":
          setScreen("game");
          break;
        case "ended":
          if (!resultShownRef.current) {
            resultShownRef.current = true;
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (votePhaseIntervalRef.current) {
              clearInterval(votePhaseIntervalRef.current);
            }
            setModalVoteOpen(false);
            setModalGuessOpen(false);
            setScreen("result");
          }
          break;
        default:
          break;
      }

      setRoomState(state);
    },
    [resetRoundState],
  );

  const subscribeRoom = useCallback(() => {
    const roomId = roomIdRef.current;
    const myId = myIdRef.current;
    if (!roomId || !myId) return;

    unsubscribeAll();

    const roomRef = ref(db, `rooms/${roomId}`);
    roomRefObj.current = roomRef;

    unsubRoom.current = onValue(roomRef, (snap) => {
      if (!snap.exists()) {
        clearSession();
        alert("Комната была удалена.");
        backToJoin();
        return;
      }
      handleStateChange(snap.val() as RoomState);
    });

    const privRef = ref(db, `rooms/${roomId}/private/${myId}`);
    privateRefObj.current = privRef;
    unsubPrivate.current = onValue(privRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val() as PlayerRole;
      if (myRoleRef.current === null) {
        myRoleRef.current = data;
        iAmSpyRef.current = data.isSpy;
        setMyRole(data);
        setIAmSpy(data.isSpy);
      }
    });

    const presenceRef = ref(db, `rooms/${roomId}/presence/${myId}`);
    set(presenceRef, true);
    // Хост получает 120 сек на реконнект — его presence не удаляется сразу
    if (!iAmHostRef.current) {
      onDisconnect(presenceRef).remove();
    } else {
      // Для хоста: помечаем время дисконнекта, не удаляем сразу
      const hostDisconnectRef = ref(db, `rooms/${roomId}/hostDisconnectAt`);
      onDisconnect(hostDisconnectRef).set(Date.now() + 120000);
    }

    onValue(ref(db, `rooms/${roomId}/presence`), (snap) => {
      const online = snap.val() ? Object.keys(snap.val()).length : 0;
      if (online === 0) {
        setTimeout(() => {
          get(ref(db, `rooms/${roomId}/presence`)).then((s) => {
            if (!s.exists() || !s.val() || Object.keys(s.val()).length === 0) {
              remove(ref(db, `rooms/${roomId}`));
            }
          });
        }, 10000);
      }
    });

    // Следим за сменой хоста: если hostId исчез из players — передаём хостство
    onValue(ref(db, `rooms/${roomId}/hostId`), async (snap) => {
      const currentHostId = snap.val() as string | null;
      if (!currentHostId || !myIdRef.current) return;
      const hostPlayerSnap = await get(ref(db, `rooms/${roomId}/players/${currentHostId}`));
      if (!hostPlayerSnap.exists() && iAmHostRef.current) {
        // Мы уже хост — ничего не делаем
        return;
      }
      if (!hostPlayerSnap.exists()) {
        // Хост пропал — первый онлайн игрок берёт хостство через 120 сек
        setTimeout(async () => {
          const hostStillGone = await get(ref(db, `rooms/${roomId}/players/${currentHostId}`));
          if (!hostStillGone.exists()) {
            const myPlayerSnap = await get(ref(db, `rooms/${roomId}/players/${myIdRef.current!}`));
            if (!myPlayerSnap.exists()) return;
            // Берём хостство если мы первый в списке
            const allPlayersSnap = await get(ref(db, `rooms/${roomId}/players`));
            const allPlayers = Object.keys(allPlayersSnap.val() || {});
            if (allPlayers[0] === myIdRef.current) {
              iAmHostRef.current = true;
              await update(ref(db, `rooms/${roomId}`), { hostId: myIdRef.current });
              await update(ref(db, `rooms/${roomId}/players/${myIdRef.current}`), { isHost: true });
              persistSession();
            }
          }
        }, 120000);
      }
    });

    persistSession();
    if (iAmHostRef.current) watchSpyGuessRef.current(roomId);
  }, [backToJoin, handleStateChange, persistSession, unsubscribeAll]);

  const hostEndGame = useCallback(
    async (
      reason: string,
      targetId: string | null = null,
      guess: string | null = null,
    ) => {
      const roomId = roomIdRef.current;
      if (!roomId || !roomRefObj.current) return;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      const snap = await get(roomRefObj.current);
      const rs = snap.val() as RoomState;
      if (rs?.status === "ended") return;

      const spyId = hostSpyIdRef.current || rs._spyId || "";
      const location = hostLocationRef.current || rs._location || "";

      await update(roomRefObj.current, {
        status: "ended",
        endReason: reason,
        eliminatedId: targetId,
        spyGuessResult: guess,
        revealedSpyId: spyId,
        revealedLocation: location,
      });
      await addLog("— Игра завершена —");
    },
    [addLog],
  );

  const watchSpyGuess = useCallback(
    (roomId: string) => {
      if (unsubSpyGuess.current) unsubSpyGuess.current();
      unsubSpyGuess.current = onValue(
        ref(db, `rooms/${roomId}/spyGuess`),
        (snap) => {
          if (!snap.exists() || !iAmHostRef.current) return;
          void get(ref(db, `rooms/${roomId}`)).then((roomSnap) => {
            const rs = roomSnap.val() as RoomState;
            if (rs?.status !== "playing") return;
            const guess = snap.val() as string;
            const location = hostLocationRef.current || rs._location || "";
            void hostEndGame(
              guess === location ? "spy-win" : "spy-fail",
              null,
              guess,
            );
          });
        },
      );
    },
    [hostEndGame],
  );

  watchSpyGuessRef.current = watchSpyGuess;

  const finalizeVote = useCallback(async () => {
    if (!iAmHostRef.current) return;
    if (votePhaseIntervalRef.current) clearInterval(votePhaseIntervalRef.current);
    const roomId = roomIdRef.current;
    if (!roomId) return;
    // Читаем свежие данные из Firebase
    const freshSnap = await get(ref(db, `rooms/${roomId}`));
    if (!freshSnap.exists()) return;
    const freshRoom = freshSnap.val() as RoomState;
    const votes = freshRoom.playerVotes || {};
    const tally: Record<string, number> = {};
    Object.values(votes).forEach((tid) => {
      tally[tid] = (tally[tid] || 0) + 1;
    });
    let maxV = 0;
    let topId: string | null = null;
    Object.entries(tally).forEach(([pid, cnt]) => {
      if (cnt > maxV) {
        maxV = cnt;
        topId = pid;
      }
    });
    if (!topId) {
      await hostEndGame("time");
      return;
    }
    const spyId = hostSpyIdRef.current || freshRoom._spyId || "";
    await hostEndGame(topId === spyId ? "caught" : "wrong", topId);
  }, [hostEndGame]);

  const startVotePhase = useCallback(async () => {
    if (roomState.votePhase === "voting" || !roomRefObj.current) return;
    const voteEnd = Date.now() + 60000;
    await update(roomRefObj.current, {
      votePhase: "voting",
      voteEnd,
      playerVotes: null,
    });
    await addLog("⚖️ Голосование началось! 60 секунд.");
  }, [addLog, roomState.votePhase]);

  const createRoom = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showError("Введи своё имя!");
      return;
    }

    myNameRef.current = trimmed;
    const roomId = randomCode();
    roomIdRef.current = roomId;
    iAmHostRef.current = true;

    try {
      await set(ref(db, `rooms/${roomId}`), {
        code: roomId,
        status: "waiting",
        timerMin: 8,
        createdAt: ts(),
        hostId: null,
      });
      const playerRef = await push(ref(db, `rooms/${roomId}/players`), {
        name: trimmed,
        avatar: myAvatar,
        isHost: true,
        ready: false,
      });
      myIdRef.current = playerRef.key;
      setMyId(playerRef.key);
      setRoomId(roomId);
      await update(ref(db, `rooms/${roomId}`), { hostId: myIdRef.current });
      subscribeRoom();
      setScreen("waiting");
      persistSession();
    } catch (e) {
      showError("Ошибка: " + (e as Error).message);
    }
  }, [myAvatar, name, persistSession, showError, subscribeRoom]);

  const joinRoom = useCallback(
    async (code: string, playerName: string) => {
      const trimmed = playerName.trim();
      const roomCode = code.trim().toUpperCase();
      if (!trimmed) {
        showError("Введи своё имя!");
        return;
      }
      if (!roomCode) {
        showError("Введи код комнаты!");
        return;
      }

      myNameRef.current = trimmed;
      roomIdRef.current = roomCode;
      iAmHostRef.current = false;

      try {
        const snap = await get(ref(db, `rooms/${roomCode}`));
        if (!snap.exists()) {
          showError("Комната не найдена!");
          return;
        }
        const room = snap.val() as RoomState;
        if (room.status === "ended") {
          showError("Игра уже завершена.");
          return;
        }

        const playerRef = await push(ref(db, `rooms/${roomCode}/players`), {
          name: trimmed,
          avatar: myAvatar,
          isHost: false,
          ready: false,
        });
        myIdRef.current = playerRef.key;
        setMyId(playerRef.key);
        setRoomId(roomCode);
        subscribeRoom();
        setScreen("waiting");
        persistSession();
      } catch (e) {
        showError("Ошибка: " + (e as Error).message);
      }
    },
    [myAvatar, persistSession, showError, subscribeRoom],
  );

  const quickJoin = useCallback(async () => {
    await joinRoom(urlRoomCode, quickName);
  }, [joinRoom, quickName, urlRoomCode]);

  const leaveRoom = useCallback(async () => {
    const roomId = roomIdRef.current;
    const myId = myIdRef.current;
    unsubscribeAll();
    if (roomId && myId) {
      await remove(ref(db, `rooms/${roomId}/players/${myId}`));
      await remove(ref(db, `rooms/${roomId}/private/${myId}`));
      await remove(ref(db, `rooms/${roomId}/presence/${myId}`));
    }
    backToJoin();
  }, [backToJoin, unsubscribeAll]);

  const copyLink = useCallback(() => {
    const roomId = roomIdRef.current;
    const url = `${window.location.origin}/spy?room=${roomId}`;
    void navigator.clipboard.writeText(url).catch(() => {});
    setCopyHint("✓ Скопировано!");
    setTimeout(() => setCopyHint(""), 1500);
  }, []);

  const updateTimerSetting = useCallback(async (min: number) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    await update(ref(db, `rooms/${roomId}`), { timerMin: min });
  }, []);

  const hostStartGame = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    // Проверяем хостство напрямую из Firebase чтобы не зависеть от stale ref
    const roomSnap = await get(ref(db, `rooms/${roomId}`));
    if (!roomSnap.exists()) return;
    const roomData = roomSnap.val() as RoomState;
    const myId = myIdRef.current;
    if (roomData.hostId !== myId) return;
    const snap = await get(ref(db, `rooms/${roomId}/players`));
    const players = Object.entries(snap.val() || {}) as [string, Player][];
    if (players.length < 3) {
      alert("Нужно минимум 3 игрока!");
      return;
    }

    const spyIdx = Math.floor(Math.random() * players.length);
    const spyId = players[spyIdx][0];
    const location = rand(getActiveLocations());
    const roundTs = ts();
    const activeLocations = getActiveLocations();

    hostLocationRef.current = location;
    hostSpyIdRef.current = spyId;

    await update(ref(db, `rooms/${roomId}`), {
      status: "role_reveal",
      startedAt: roundTs,
      endedAt: null,
      endReason: null,
      votePhase: null,
      voteEnd: null,
      voteRequests: null,
      playerVotes: null,
      spyGuess: null,
      spyGuessResult: null,
      eliminatedId: null,
      log: null,
      locationsList: activeLocations,
      _spyId: spyId,
      _location: location,
    });

    for (const [pid] of players) {
      await update(ref(db, `rooms/${roomId}/players/${pid}`), { ready: false });
    }

    for (const [pid] of players) {
      const isSpy = pid === spyId;
      await set(ref(db, `rooms/${roomId}/private/${pid}`), {
        isSpy,
        location: isSpy ? null : location,
      });
    }

    watchSpyGuess(roomId);
  }, [getActiveLocations, watchSpyGuess]);

  const confirmRole = useCallback(async () => {
    const roomId = roomIdRef.current;
    const myId = myIdRef.current;
    if (!roomId || !myId) return;
    await update(ref(db, `rooms/${roomId}/players/${myId}`), { ready: true });
    setScreen("game");
    // Хост проверяет готовность всех в useEffect через roomState
  }, []);

  const requestVote = useCallback(async () => {
    const roomId = roomIdRef.current;
    const myId = myIdRef.current;
    if (!roomId || !myId) return;

    if (roomState.votePhase === "voting") {
      const voted = roomState.playerVotes?.[myId];
      if (!voted) setModalVoteOpen(true);
      return;
    }
    if (myVoteRequestSentRef.current) return;
    myVoteRequestSentRef.current = true;
    await set(ref(db, `rooms/${roomId}/voteRequests/${myId}`), true);
    await addLog(`"${myNameRef.current}" хочет начать голосование`);
  }, [addLog, roomState]);

  const castVote = useCallback(
    async (targetId: string) => {
      const roomId = roomIdRef.current;
      const myId = myIdRef.current;
      if (!roomId || !myId) return;
      await set(ref(db, `rooms/${roomId}/playerVotes/${myId}`), targetId);
      await addLog(`"${myNameRef.current}" проголосовал`);
      setModalVoteOpen(false);

      if (iAmHostRef.current) {
        // Читаем свежие данные из Firebase чтобы не было stale closure
        const freshSnap = await get(ref(db, `rooms/${roomId}`));
        if (!freshSnap.exists()) return;
        const freshRoom = freshSnap.val() as RoomState;
        const players = Object.keys(freshRoom.players || {});
        const votes = { ...(freshRoom.playerVotes || {}), [myId]: targetId };
        const majority = Math.ceil(players.length / 2);
        const tally: Record<string, number> = {};
        Object.values(votes).forEach((tid) => {
          tally[tid] = (tally[tid] || 0) + 1;
        });
        const hasWinner = Object.values(tally).some((cnt) => cnt >= majority);
        const allVoted = players.every((pid) => votes[pid]);
        if (hasWinner || allVoted) await finalizeVote();
      }
    },
    [addLog, finalizeVote, roomState],
  );

  const spyGuess = useCallback(
    async (loc: string) => {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      await addLog(`🕵️ Шпион называет локацию: "${loc}"`);
      await update(ref(db, `rooms/${roomId}`), {
        spyGuess: loc,
        spyGuessAt: ts(),
      });
      setModalGuessOpen(false);
    },
    [addLog],
  );

  const hostNewRound = useCallback(async () => {
    resetRoundState();
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const players = Object.keys(roomState.players || {});

    for (const pid of players) {
      await update(ref(db, `rooms/${roomId}/players/${pid}`), { ready: false });
      await remove(ref(db, `rooms/${roomId}/private/${pid}`));
    }

    const spyIdx = Math.floor(Math.random() * players.length);
    const spyId = players[spyIdx];
    const location = rand(getActiveLocations());
    const newTs = ts();
    currentRoundIdRef.current = newTs;
    const activeLocations = getActiveLocations();

    hostLocationRef.current = location;
    hostSpyIdRef.current = spyId;

    await update(ref(db, `rooms/${roomId}`), {
      status: "role_reveal",
      startedAt: newTs,
      endedAt: null,
      endReason: null,
      votePhase: null,
      voteEnd: null,
      voteRequests: null,
      playerVotes: null,
      spyGuess: null,
      spyGuessResult: null,
      eliminatedId: null,
      revealedSpyId: null,
      revealedLocation: null,
      log: null,
      timerEnd: null,
      locationsList: activeLocations,
      _spyId: spyId,
      _location: location,
    });

    for (const pid of players) {
      const isSpy = pid === spyId;
      await set(ref(db, `rooms/${roomId}/private/${pid}`), {
        isSpy,
        location: isSpy ? null : location,
      });
    }

    watchSpyGuess(roomId);
  }, [getActiveLocations, resetRoundState, roomState.players, watchSpyGuess]);

  const saveCustomDict = useCallback((text: string) => {
    setCustomLocationsText(text);
    customLocationsRef.current = text
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  useEffect(() => {
    if (
      roomState.status === "role_reveal" &&
      !roleShownRef.current &&
      myRoleRef.current
    ) {
      roleShownRef.current = true;
      setScreen("role");
    }
  }, [roomState.status, roomState.startedAt]);

  // Хост следит за готовностью всех игроков и запускает игру
  useEffect(() => {
    if (!iAmHostRef.current) return;
    if (roomState.status !== "role_reveal") return;
    const players = roomState.players ? Object.values(roomState.players) as Player[] : [];
    if (players.length < 3) return;
    if (players.every((p) => p.ready)) {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      const timerMin = roomState.timerMin || 8;
      void update(ref(db, `rooms/${roomId}`), {
        status: "playing",
        timerEnd: Date.now() + timerMin * 60 * 1000,
      });
    }
  }, [roomState.players, roomState.status, roomState.timerMin]);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const init = async () => {
      const session = loadSession();

      // Если зашли по ссылке с другим кодом — чужая комната, сбрасываем сессию
      if (urlRoomCode && session?.roomId && session.roomId !== urlRoomCode) {
        clearSession();
      }

      // Реконнект: если в URL есть код И сессия совпадает — реконнектимся
      // Если URL пустой — используем сессию как обычно
      const activeSession = (urlRoomCode && session?.roomId === urlRoomCode)
        ? session
        : urlRoomCode
          ? null
          : session;
      if (activeSession?.roomId && activeSession?.myId) {
        const snap = await get(ref(db, `rooms/${activeSession.roomId}`));
        if (snap.exists()) {
          const room = snap.val() as RoomState;
          myIdRef.current = activeSession.myId;
          setMyId(activeSession.myId);
          myNameRef.current = activeSession.myName;
          roomIdRef.current = activeSession.roomId;
          setRoomId(activeSession.roomId);
          iAmHostRef.current =
            activeSession.iAmHost || room.hostId === activeSession.myId;
          setMyAvatar(activeSession.myAvatar || AVATARS[0]);

          const playerSnap = await get(
            ref(db, `rooms/${activeSession.roomId}/players/${activeSession.myId}`),
          );
          if (!playerSnap.exists()) {
            await set(
              ref(db, `rooms/${activeSession.roomId}/players/${activeSession.myId}`),
              {
                name: activeSession.myName,
                avatar: activeSession.myAvatar || "🕵️",
                isHost: iAmHostRef.current,
                ready: false,
              },
            );
          }

          currentRoundIdRef.current = room.startedAt || null;

          if (room.status === "playing" || room.status === "role_reveal") {
            const privSnap = await get(
              ref(db, `rooms/${activeSession.roomId}/private/${activeSession.myId}`),
            );
            if (privSnap.exists()) {
              const role = privSnap.val() as PlayerRole;
              myRoleRef.current = role;
              iAmSpyRef.current = role.isSpy;
              setMyRole(role);
              setIAmSpy(role.isSpy);
              roleShownRef.current = room.status === "playing";
            }
          }

          subscribeRoom();
          return;
        }
        clearSession();
      }

      setJoinMode(urlRoomCode ? "quick" : "normal");
    };

    void init();
  }, [subscribeRoom, urlRoomCode]);

  useEffect(() => {
    if (screen !== "game" || !roomState.timerEnd) return;
    if (lastTimerEndRef.current === roomState.timerEnd) return;
    lastTimerEndRef.current = roomState.timerEnd;

    const tick = () => {
      const left = Math.max(
        0,
        Math.round((roomState.timerEnd! - Date.now()) / 1000),
      );
      const m = Math.floor(left / 60);
      const s = left % 60;
      setTimerDisplay(
        `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
      setTimerUrgent(left < 60);
      const total = (roomState.timerMin || 8) * 60;
      setTimerFill(`${(left / total) * 100}%`);
      if (left <= 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (iAmHostRef.current) void hostEndGame("time");
      }
    };

    tick();
    timerIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [screen, roomState.timerEnd, roomState.timerMin, hostEndGame]);

  useEffect(() => {
    if (screen !== "game") return;
    const phase = roomState.votePhase;
    const requests = roomState.voteRequests
      ? Object.keys(roomState.voteRequests).length
      : 0;
    const total = roomState.players
      ? Object.keys(roomState.players).length
      : 1;
    const needed = Math.ceil(total / 2);
    const myId = myIdRef.current;

    if (phase === "voting") {
      const alreadyVoted = myId && roomState.playerVotes?.[myId];
      if (!alreadyVoted && !modalVoteOpen) setModalVoteOpen(true);

      if (!votePhaseRenderedRef.current && roomState.voteEnd) {
        votePhaseRenderedRef.current = true;
        if (votePhaseIntervalRef.current) {
          clearInterval(votePhaseIntervalRef.current);
        }
        votePhaseIntervalRef.current = setInterval(() => {
          const left = Math.max(
            0,
            Math.round((roomState.voteEnd! - Date.now()) / 1000),
          );
          const m = Math.floor(left / 60);
          const s = left % 60;
          const fmt = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
          setVotePhaseTimer(fmt);
          const voted = myId && roomState.playerVotes?.[myId];
          setVotePhaseSub(
            voted ? "✓ Твой голос засчитан" : "Выбери подозреваемого!",
          );
          if (left <= 0) {
            if (votePhaseIntervalRef.current) {
              clearInterval(votePhaseIntervalRef.current);
            }
            if (iAmHostRef.current) void finalizeVote();
          }
        }, 500);
      }

      if (
        iAmHostRef.current &&
        requests >= needed &&
        phase !== "voting"
      ) {
        /* handled below */
      }
    } else {
      votePhaseRenderedRef.current = false;
      if (
        iAmHostRef.current &&
        requests >= needed &&
        roomState.votePhase !== "voting"
      ) {
        void startVotePhase();
      }
    }

    return () => {
      if (votePhaseIntervalRef.current) {
        clearInterval(votePhaseIntervalRef.current);
      }
    };
  }, [
    screen,
    roomState,
    modalVoteOpen,
    finalizeVote,
    startVotePhase,
  ]);

  useEffect(() => {
    return () => {
      unsubscribeAll();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (votePhaseIntervalRef.current) {
        clearInterval(votePhaseIntervalRef.current);
      }
    };
  }, [unsubscribeAll]);

  const players = roomState.players
    ? Object.entries(roomState.players)
    : [];
  const amHost = iAmHostRef.current || roomState.hostId === myId;
  const shareUrl = roomId
    ? `${window.location.origin}/spy?room=${roomId}`
    : "";

  const resultData = (() => {
    const state = roomState;
    const spyId = state.revealedSpyId;
    const location = state.revealedLocation || "?";
    const spyName = (spyId && state.players?.[spyId]?.name) || "?";
    const reason = state.endReason;

    if (reason === "caught") {
      const target = state.players?.[state.eliminatedId || ""]?.name || "?";
      return {
        emoji: "🎉",
        title: "Шпион пойман!",
        sub: "Мирные жители победили",
        rows: [
          ["Обвинён", target],
          ["Шпион был", spyName],
          ["Локация", location],
        ] as [string, string][],
      };
    }
    if (reason === "wrong") {
      const target = state.players?.[state.eliminatedId || ""]?.name || "?";
      return {
        emoji: "🕵️",
        title: "Шпион сбежал!",
        sub: "Выбрали не того — шпион победил",
        rows: [
          ["Обвинили", target],
          ["А шпион", spyName],
          ["Локация", location],
        ],
      };
    }
    if (reason === "spy-win") {
      return {
        emoji: "🕵️",
        title: "Шпион угадал!",
        sub: `${spyName} разгадал локацию`,
        rows: [
          ["Шпион", spyName],
          ["Локация", location],
          ["Победа", "Шпион 🕵️"],
        ],
      };
    }
    if (reason === "spy-fail") {
      return {
        emoji: "🎉",
        title: "Шпион ошибся!",
        sub: "Мирные жители победили",
        rows: [
          ["Шпион назвал", state.spyGuessResult || "?"],
          ["Настоящая локация", location],
          ["Шпион", spyName],
        ],
      };
    }
    return {
      emoji: "⏰",
      title: "Время вышло!",
      sub: "Шпион не найден — шпион победил",
      rows: [
        ["Шпион", spyName],
        ["Локация", location],
      ],
    };
  })();

  const sortedLog = roomState.log
    ? Object.values(roomState.log).sort((a, b) => a.t - b.t)
    : [];

  const voteRequestsCount = roomState.voteRequests
    ? Object.keys(roomState.voteRequests).length
    : 0;
  const voteNeeded = Math.ceil(
    (roomState.players ? Object.keys(roomState.players).length : 1) / 2,
  );
  const myVoteRequested =
    myIdRef.current && roomState.voteRequests?.[myIdRef.current];

  const guessLocations =
    roomState.locationsList && roomState.locationsList.length > 0
      ? [...roomState.locationsList].sort(() => Math.random() - 0.5)
      : [...LOCATIONS].sort(() => Math.random() - 0.5);

  return {
    screen,
    joinMode,
    joinError,
    name,
    setName,
    quickName,
    setQuickName,
    myAvatar,
    setMyAvatar,
    roomState,
    players,
    amHost,
    shareUrl,
    roomId,
    myId,
    iAmSpy,
    myRole,
    timerDisplay,
    timerFill,
    timerUrgent,
    votePhaseTimer,
    votePhaseSub,
    modalVoteOpen,
    setModalVoteOpen,
    modalGuessOpen,
    setModalGuessOpen,
    dictMode,
    setDictMode,
    customLocationsText,
    saveCustomDict,
    copyHint,
    copyLink,
    createRoom,
    joinRoom,
    quickJoin,
    leaveRoom,
    updateTimerSetting,
    hostStartGame,
    confirmRole,
    requestVote,
    castVote,
    spyGuess,
    hostEndGame: (reason: string) => hostEndGame(reason),
    hostNewRound,
    resultData,
    sortedLog,
    voteRequestsCount,
    voteNeeded,
    myVoteRequested,
    guessLocations,
    urlRoomCode,
  };
}
