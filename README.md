# GooseGames

Браузерная платформа игр для компании. React + TypeScript + Vite + Firebase Realtime Database.

## Запуск локально

```bash
npm install
npm run dev
```

Открой адрес из терминала (обычно http://localhost:5173).

## Маршруты

| Путь | Описание |
|------|----------|
| `/` | Главная — выбор игры |
| `/spy` | «Шпион» — лобби и мультиплеер |
| `/spy?room=XXXX` | Быстрый вход в комнату |

## Структура `src/`

```
src/
  pages/          — страницы (главная)
  games/spy/      — игра «Шпион»
  components/     — общие компоненты
  store/          — Zustand (позже)
  types/          — общие типы
  styles/         — стили главной
  firebase.ts     — Firebase (база данных, не хостинг)
```

## Сборка

```bash
npm run build
npm run preview
```

## Деплой (Vercel)

**Firebase** здесь только для Realtime Database (мультиплеер). **Сайт** выкладываем на **Vercel**.

### Первый раз

1. Зарегистрируйся на [vercel.com](https://vercel.com) (можно через GitHub).
2. В терминале в папке проекта:

```bash
npx vercel login
npx vercel
```

Ответь на вопросы (проект новый, framework — Vite подхватится сам). После этого появится preview-URL.

### Продакшен

```bash
npm run deploy
```

(внутри вызывается `npx vercel --prod`)

### Через сайт Vercel (без CLI)

1. Залей проект на GitHub.
2. [vercel.com/new](https://vercel.com/new) → Import репозитория.
3. Build Command: `npm run build`, Output: `dist` (обычно подставляется автоматически).

Маршруты `/spy` и `/spy?room=...` работают за счёт `vercel.json` (SPA rewrite).
