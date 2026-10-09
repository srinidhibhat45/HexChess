# HexChess

A responsive, installable Gliński hexagonal chess game. Built with React, TypeScript, and Vite. No backend, account, or live multiplayer service is required.

## Run

```sh
npm install
npm run dev
```

Open the local address printed by Vite. To test installation and offline support, use the production build:

```sh
npm run build
npm run preview -- --port 4173
```

The service worker is enabled in production only. A successful first visit caches the entire app, fonts, tutorial, and computer worker. The video and external references need internet access.

## Included

- An original responsive SVG board with 91 cells and sharp black / ivory pieces and a soft grayscale Classic board by default. Garden, Slate, and Walnut remain available.
- Complete Gliński movement rules, king safety, check, checkmate, en passant, four promotion choices, and the pawn double-step option from any friendly pawn starting cell.
- Original ¾–¼ stalemate scoring. Automatic draws at three repetitions, 100 half-moves without a capture or pawn move, and conservatively recognized insufficient material. Remaining unusual dead positions can be drawn by agreement.
- Computer opponents with three practical difficulty settings using time-bounded iterative-deepening alpha-beta search in a Web Worker. These levels are not Elo ratings and are not presented as tournament-strength play.
- Pass-and-play on one device.
- Backend-free correspondence links containing complete validated move history. The recipient makes a move and shares the updated link back. Links are snapshots, not synchronized rooms; use the latest reply. Each session plays one color, and replies for a known game must preserve saved history and add at most one opponent move.
- Zen mode automatically activates when a game starts. Exit zen, Z, or Esc restores the playing room; your choice persists.
- Configurable clocks from 0–180 minutes, increment from 0–120 seconds, presets, pause / resume in computer practice, and wall-time accounting through background tabs and reloads. Clock begins after White’s opening move. Timeout is a loss, except against a bare king when the app records a draw.
- Takebacks and hints in computer practice. Human games remove assistance and pause controls. Flip board, move review, resignation, and draw agreements remain available; correspondence draws use an offer and returned acceptance.
- Right-drag arrows, right-click cell circles, four annotation colors, repeat-to-remove, and a two-tap Draw tool for touch and keyboard users. Annotations clear on a move or ordinary left-click; Esc or Clear arrows removes them.
- Optional single premoves for computer and correspondence games: select your piece and destination during the opponent’s turn. Blue cells mark the pending move; cancel it with the visible control or Esc. Legal moves and clock rules are rechecked after the reply, including captures, pins, promotion, and game end. Premoves persist only on the device and are excluded from shared links.
- Device-local autosave, game export / import, four board palettes, coordinates, dark mode, optional sound, and reduced-motion support.
- Six interactive piece lessons, extensive original rules and strategy guidance, an embedded version of the user-supplied video, and further reading.
- Keyboard navigation: focus the board with Tab, move focus using arrow keys, and select / move with Enter or Space. Pointer users can tap, click, or drag pieces.
- Self-hosted OFL fonts, offline precaching, application icons, maskable icon, and install instructions for iOS, Android, and desktop.

## Share and hosting

Sharing works between devices once the app is hosted at a publicly reachable HTTPS address. A `localhost` URL is usable only on the originating device; local network preview addresses may be used on the same network, but PWA installation normally requires HTTPS.

Deploy the generated **`dist/`** directory to any static HTTPS host (for example Cloudflare Pages, Netlify, or Vercel). Serve at the domain root: the manifest, service worker, and asset URLs use `/`. No secrets or environment variables are needed. For the requested Vercel deployment at **hexchess.srinidhibhat.com**, see [DEPLOYMENT.md](DEPLOYMENT.md). The repository includes Vercel configuration and CI; Vercel import and DNS connection remain to be completed. Serve `/sw.js` with `Cache-Control: no-cache`; hashed files under `/assets/` can have long immutable caching. Keep `/index.html` revalidated. A Content Security Policy must allow the embedded video at `https://www.youtube-nocookie.com` and local Web Workers.

No site has been deployed publicly as part of the local build. Service-worker updates wait until existing tabs close, so an update does not interrupt a game. Your current game remains saved on the device. Imports retain game history and results; timed imports start with fresh clocks. Computer practice imports are paused; human games run without pause controls.

There are no analytics, accounts, cloud saves, sockets, or live matchmaking. Game links carry player names and moves in the URL fragment, which is not sent in an HTTP request to the host. Anyone given a link can read the snapshot. Legal moves and device-known history are validated, but links have no authenticated identity. Editing the client or a first-time snapshot and using outside engine assistance cannot be prevented offline. Shared play is intended for friendly games. Very long games can produce long URLs; export a game file if a messaging application limits URL length.

## Verification

```sh
npm test
npm run build
```

The engine, session, fair-play, and offline-cache suites checks geometry, starting armies, bishop colors, all tutorial destinations, king safety and pins, checkmate, stalemate, pawn movement, retained double steps, en passant and discovered check, underpromotion, draws, history validation, AI legality, clock accounting, Unicode game links, corrupted-storage recovery, offline navigation fallback, Origin-varying cached modules, and cache updates, automatic zen mode, retained focus preferences, restricted assistance, assigned player colors, conflicting link rejection, draw handshakes, fabricated results, and clock bounds, premove execution, clock accounting, captures, blocked destinations, stale queues, privacy, promotion choices, and correspondence replies. Desktop and phone layouts, tutorial completion, AI replies, custom clocks, undo, shared-link round trips, reload persistence, and offline play were also checked through the browser.

## Rules and references

- [User-supplied video: Chess Is Better on Hexagons](https://youtu.be/bgR3yESAEVE)
- [The Chess Variant Pages: Gliński’s Hexagonal Chess](https://www.chessvariants.com/hexagonal.dir/hexagonal.html)
- [Abstract Games, Issue 7](https://www.abstractgames.org/uploads/1/1/6/4/116462923/abstract_games_issue_7.pdf), including discussion of hexagonal chess and Gliński’s work.
- Władysław Gliński, *First Theories of Hexagonal Chess* (1974), cited as further reading. The book is not bundled or reproduced.

Some contemporary sites alter stalemate scoring or pawn rules. HexChess explicitly describes and applies its Gliński rules rather than combining variants. The tutorial prose and artwork are original; font licenses are under `public/fonts/`.
