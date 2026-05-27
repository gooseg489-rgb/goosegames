import { Link } from "react-router-dom";
import "../styles/home.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-wrap">
        <header>
          <div className="logo-block">
            <div className="logo">GooseGames</div>
            <div className="tagline">Игры для компании, прямо в браузере</div>
          </div>
          <div className="header-badge">
            Мультиплеер
            <br />
            без установок
            <span>🎮</span>
          </div>
        </header>

        <div className="section-label">Доступные игры</div>

        <div className="games-grid">
          <Link className="game-card" to="/spy">
            <div className="card-art art-spy">
              <div className="art-bg" />
              <div className="art-emoji">🕵️</div>
            </div>
            <div className="card-body">
              <div className="card-top">
                <div className="card-name">Шпион</div>
                <div className="card-arrow">→</div>
              </div>
              <div className="card-desc">
                Все знают локацию — кроме одного. Найди шпиона раньше, чем он
                тебя.
              </div>
              <div className="card-meta">
                <span className="tag accent">3–12 игроков</span>
                <span className="tag accent">Мультиплеер</span>
                <span className="tag new">Доступно</span>
              </div>
            </div>
          </Link>

          <div className="game-card soon">
            <div className="card-art art-soon">
              <div className="art-emoji">🎭</div>
            </div>
            <div className="card-body">
              <div className="card-top">
                <div className="card-name">Мафия</div>
              </div>
              <div className="card-desc">
                Классика жанра. Мирные против мафии — кто хитрее?
              </div>
              <div className="card-meta">
                <span className="tag">Скоро</span>
              </div>
            </div>
          </div>

          <div className="game-card soon">
            <div className="card-art art-soon">
              <div className="art-emoji">🎨</div>
            </div>
            <div className="card-body">
              <div className="card-top">
                <div className="card-name">Крокодил</div>
              </div>
              <div className="card-desc">
                Рисуй — угадывай. Кто объяснит молча лучше всех?
              </div>
              <div className="card-meta">
                <span className="tag">Скоро</span>
              </div>
            </div>
          </div>
        </div>

        <footer>
          <div className="footer-logo">GooseGames</div>
          <div className="footer-text">
            Бесплатно. Без регистрации. Только браузер.
          </div>
        </footer>
      </div>
    </div>
  );
}
