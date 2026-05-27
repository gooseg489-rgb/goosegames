import { Link } from "react-router-dom";
import { AvatarGrid } from "./AvatarGrid";
import { useSpyRoom } from "./useSpyRoom";
import "./spy.css";

function Screen({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={`screen${active ? " active" : ""}`}>
      {children}
    </div>
  );
}

export default function SpyGame() {
  const s = useSpyRoom();
  const timerMin = s.roomState.timerMin || 8;
  const canStart = s.players.length >= 3;
  const votePhase = s.roomState.votePhase === "voting";
  const myVoteSent =
    s.myId && s.roomState.playerVotes?.[s.myId as string];

  return (
    <div className="spy-app">
        <header>
          <Link
            to="/"
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              textDecoration: "none",
              letterSpacing: "0.1em",
            }}
          >
            ← GooseGames
          </Link>
          {s.screen !== "join" && s.roomId && (
            <div className="room-badge" style={{ display: "inline-flex" }}>
              <span className="dot" />
              Комната:{" "}
              <span
                className="code"
                title="Нажмите чтобы скопировать ссылку"
                onClick={s.copyLink}
                onKeyDown={(e) => e.key === "Enter" && s.copyLink()}
                role="button"
                tabIndex={0}
              >
                {s.roomId}
              </span>
            </div>
          )}
        </header>

        <main>
          <Screen id="screen-join" active={s.screen === "join"}>
            {s.joinMode === "normal" ? (
              <>
                <button
                  type="button"
                  className="btn primary mb1"
                  style={{ marginTop: "1.5rem" }}
                  onClick={() => void s.createRoom()}
                >
                  Создать комнату
                </button>
                <div className="card mb1">
                  <div className="section-label">Твоё имя</div>
                  <input
                    type="text"
                    placeholder="Введи своё имя"
                    maxLength={20}
                    autoComplete="off"
                    value={s.name}
                    onChange={(e) => s.setName(e.target.value)}
                  />
                </div>
                <div className="card mb1">
                  <div className="section-label">Аватар</div>
                  <AvatarGrid selected={s.myAvatar} onSelect={s.setMyAvatar} />
                </div>
              </>
            ) : (
              <>
                <div className="card mb1">
                  <div className="section-label">Твоё имя</div>
                  <input
                    type="text"
                    placeholder="Введи своё имя"
                    maxLength={20}
                    autoComplete="off"
                    value={s.quickName}
                    onChange={(e) => s.setQuickName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void s.quickJoin()}
                  />
                </div>
                <div className="card mb1">
                  <div className="section-label">Аватар</div>
                  <AvatarGrid selected={s.myAvatar} onSelect={s.setMyAvatar} />
                </div>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void s.quickJoin()}
                >
                  Войти →
                </button>
              </>
            )}
            {s.joinError && (
              <div
                style={{
                  color: "var(--red)",
                  fontSize: "0.9rem",
                  marginTop: "0.75rem",
                  textAlign: "center",
                }}
              >
                {s.joinError}
              </div>
            )}
          </Screen>

          <Screen id="screen-waiting" active={s.screen === "waiting"}>
            <h2>Ожидание игроков</h2>
            <div className="notice">
              Поделись ссылкой или кодом — остальные смогут войти с любого
              устройства.
            </div>
            <div className="section-label">Ссылка для друзей</div>
            <div
              className="share-url"
              onClick={s.copyLink}
              onKeyDown={(e) => e.key === "Enter" && s.copyLink()}
              role="button"
              tabIndex={0}
            >
              {s.copyHint || s.shareUrl}
            </div>
            <p className="copy-hint">Нажми чтобы скопировать</p>
            <hr className="divider" />
            <div className="section-label">
              Игроки ({s.players.length})
            </div>
            <div className="card mb1">
              {s.players.map(([pid, p]) => (
                <div key={pid} className="player-item">
                  <div className="player-avatar">
                    {p.avatar || p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-name">
                    {p.name}
                    {pid === s.myId ? " (ты)" : ""}
                  </div>
                  {p.isHost && (
                    <span className="player-role-badge host">хост</span>
                  )}
                </div>
              ))}
            </div>

            {s.amHost ? (
              <>
                <div className="card mb1">
                  <div className="section-label">Настройки</div>
                  <div className="setting-row">
                    <label>Время раунда</label>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      value={timerMin}
                      step={1}
                      onChange={(e) =>
                        void s.updateTimerSetting(parseInt(e.target.value, 10))
                      }
                    />
                    <span>{timerMin} мин</span>
                  </div>
                  <div
                    className="setting-row"
                    style={{
                      alignItems: "flex-start",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <label style={{ marginBottom: 4 }}>Словарь локаций</label>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        width: "100%",
                        marginBottom: 6,
                      }}
                    >
                      <button
                        type="button"
                        className="btn sm"
                        style={{
                          borderColor:
                            s.dictMode === "default"
                              ? "var(--accent-dim)"
                              : undefined,
                          color:
                            s.dictMode === "default"
                              ? "var(--accent)"
                              : undefined,
                        }}
                        onClick={() => s.setDictMode("default")}
                      >
                        Стандартный
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        style={{
                          borderColor:
                            s.dictMode === "custom"
                              ? "var(--accent-dim)"
                              : undefined,
                          color:
                            s.dictMode === "custom"
                              ? "var(--accent)"
                              : undefined,
                        }}
                        onClick={() => s.setDictMode("custom")}
                      >
                        Свой
                      </button>
                    </div>
                    {s.dictMode === "custom" && (
                      <textarea
                        placeholder="Введи локации через запятую или с новой строки"
                        style={{
                          width: "100%",
                          minHeight: 90,
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                          color: "var(--text)",
                          fontFamily: "'Crimson Pro', serif",
                          fontSize: "0.9rem",
                          padding: "0.6rem 0.8rem",
                          resize: "vertical",
                          outline: "none",
                        }}
                        value={s.customLocationsText}
                        onChange={(e) => s.saveCustomDict(e.target.value)}
                      />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn primary"
                  disabled={!canStart}
                  onClick={() => void s.hostStartGame()}
                >
                  Начать игру →
                </button>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    marginTop: "0.5rem",
                  }}
                >
                  {canStart ? "" : "Нужно минимум 3 игрока"}
                </p>
              </>
            ) : (
              <div className="notice">
                Ждём, пока хост запустит игру
                <span className="waiting-dots" />
              </div>
            )}

            <button
              type="button"
              className="btn mt1"
              style={{ fontSize: "1rem" }}
              onClick={() => void s.leaveRoom()}
            >
              Покинуть комнату
            </button>
          </Screen>

          <Screen id="screen-role" active={s.screen === "role"}>
            <h2 style={{ marginBottom: "1.5rem" }}>Твоя роль</h2>
            {s.iAmSpy ? (
              <div className="spy-box">
                <div className="lbl">Роль</div>
                <div className="spy-title">🕵️ Ты — Шпион</div>
                <div className="spy-sub">
                  Ты не знаешь локацию. Не спались!
                  <br />
                  Угадай её раньше, чем тебя разоблачат.
                </div>
              </div>
            ) : (
              <>
                <div className="location-box mb1">
                  <div className="lbl">Ты — мирный житель. Локация:</div>
                  <div className="loc-name">
                    {s.myRole?.location || "—"}
                  </div>
                </div>
                <div className="notice">
                  Задавай хитрые вопросы и ищи того, кто не в теме. Не раскрывай
                  локацию напрямую.
                </div>
              </>
            )}
            <button
              type="button"
              className="btn primary mt1"
              onClick={() => void s.confirmRole()}
            >
              Понял, играю! →
            </button>
          </Screen>

          <Screen id="screen-game" active={s.screen === "game"}>
            <div className="timer-wrap">
              <div className="timer-bar">
                <div
                  className="timer-fill"
                  style={{ width: s.timerFill }}
                />
              </div>
              <div
                className={`timer-display${s.timerUrgent ? " urgent" : ""}`}
              >
                {s.timerDisplay}
              </div>
            </div>

            {!s.iAmSpy && (
              <div className="location-box">
                <div className="lbl">Локация</div>
                <div className="loc-name">
                  {s.myRole?.location || "—"}
                </div>
              </div>
            )}

            {s.iAmSpy && (
              <div className="spy-box">
                <div className="lbl">Твоя роль</div>
                <div className="spy-title" style={{ fontSize: "1.4rem" }}>
                  🕵️ Ты — Шпион
                </div>
              </div>
            )}

            <div className="notice mb1">
              {s.iAmSpy
                ? "🕵️ Ты шпион. Не спались и угадай локацию!"
                : "🔍 Задавай вопросы и ищи того, кто не в теме"}
            </div>

            <div className="section-label">Игроки</div>
            <div className="game-players mb1">
              {s.players.map(([pid, p]) => (
                <div
                  key={pid}
                  className={`gp-chip${pid === s.myId ? " me" : ""}`}
                >
                  <div style={{ fontSize: "1.8rem", lineHeight: 1.2 }}>
                    {p.avatar || "👤"}
                  </div>
                  <div style={{ fontSize: "0.78rem", marginTop: 2 }}>
                    {p.name}
                    {pid === s.myId ? " ✦" : ""}
                  </div>
                </div>
              ))}
            </div>

            <div className="section-label">Журнал</div>
            <div className="game-log">
              {s.sortedLog.map((e, i) => (
                <div key={i} className="log-line">
                  {e.msg}
                </div>
              ))}
            </div>

            {votePhase && (
              <div className="vote-phase-box">
                <div className="vp-title">⚖️ Голосование началось!</div>
                <div className="vp-timer">{s.votePhaseTimer}</div>
                <div className="vp-sub">{s.votePhaseSub}</div>
              </div>
            )}

            <div className="flex mb1">
              {!votePhase && (
                <button
                  type="button"
                  className={`btn vote-start-btn${s.myVoteRequested ? " voted" : ""}`}
                  onClick={() => void s.requestVote()}
                >
                  {s.myVoteRequested
                    ? "✓ Ты за голосование"
                    : "⚖️ Начать голосование"}
                </button>
              )}
              {s.iAmSpy && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => s.setModalGuessOpen(true)}
                >
                  🗺 Угадать локацию
                </button>
              )}
            </div>
            {!votePhase && s.voteRequestsCount > 0 && (
              <div className="vp-requests">
                {s.voteRequestsCount} из {s.voteNeeded} хотят голосовать
              </div>
            )}

            {s.amHost && (
              <button
                type="button"
                className="btn"
                style={{ fontSize: "1rem" }}
                onClick={() => void s.hostEndGame("manual")}
              >
                Завершить раунд досрочно
              </button>
            )}
          </Screen>

          <Screen id="screen-result" active={s.screen === "result"}>
            <div className="result-wrap">
              <div className="result-emoji">{s.resultData.emoji}</div>
              <div className="result-title">{s.resultData.title}</div>
              <div className="result-sub">{s.resultData.sub}</div>
            </div>
            <div className="result-info">
              {s.resultData.rows.map(([k, v]) => (
                <div key={k} className="ri-row">
                  <span className="ri-key">{k}</span>
                  <span className="ri-val">{v || "?"}</span>
                </div>
              ))}
            </div>
            {s.amHost && (
              <button
                type="button"
                className="btn primary"
                onClick={() => void s.hostNewRound()}
              >
                Новый раунд →
              </button>
            )}
            <button
              type="button"
              className="btn mt1"
              onClick={() => void s.leaveRoom()}
            >
              На главную
            </button>
          </Screen>
        </main>

      <div
        className={`modal-overlay${s.modalVoteOpen ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget && !votePhase) {
            s.setModalVoteOpen(false);
          }
        }}
      >
        <div className="modal-box">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <h3 style={{ marginBottom: 0 }}>Кто шпион?</h3>
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "2.2rem",
                color: "#e74c3c",
              }}
            >
              {s.votePhaseTimer}
            </div>
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.9rem",
              marginBottom: "1rem",
              fontStyle: "italic",
            }}
          >
            Голосование безвозвратное. Выбери одного.
          </p>
          <div className="modal-opts">
            {s.players
              .filter(([pid]) => pid !== s.myId)
              .map(([pid, p]) => (
                <button
                  key={pid}
                  type="button"
                  className="modal-opt vote-opt"
                  disabled={!!myVoteSent}
                  onClick={() => void s.castVote(pid)}
                >
                  {p.name}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${s.modalGuessOpen ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) s.setModalGuessOpen(false);
        }}
      >
        <div className="modal-box">
          <h3>Назови локацию</h3>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.9rem",
              marginBottom: "1rem",
              fontStyle: "italic",
            }}
          >
            Выбери правильную — и победа твоя
          </p>
          <div className="modal-opts">
            {s.guessLocations.map((loc) => (
              <button
                key={loc}
                type="button"
                className="modal-opt loc-opt"
                onClick={() => void s.spyGuess(loc)}
              >
                {loc}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn"
            style={{ fontSize: "1rem" }}
            onClick={() => s.setModalGuessOpen(false)}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
