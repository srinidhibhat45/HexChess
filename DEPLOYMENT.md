# Deploy HexChess to Vercel

Live URL: **https://hexchess.srinidhibhat.com/**. Verified on 9 October 2026: HTTPS returned successfully from Vercel and served the same application bundle as the checked main build. The instructions below document the setup for future deployments.

## Import the repository

1. In Vercel, choose **Add New → Project**, then import **srinidhibhat45/HexChess**.
2. Use the repository root, framework **Vite**, and Node.js **22.x** (22.12 or newer).
3. Keep the settings from `vercel.json`: install `npm ci`, build `npm run check`, output `dist`.
4. No environment variables, secrets, database, or backend service are needed.
5. Deploy and open the generated HTTPS preview. The build runs all automated checks before generating the app.

The configuration includes SPA fallback routing, browser security headers, fresh HTML and service-worker checks, and immutable caching for hashed assets. The video is permitted only from YouTube’s privacy-enhanced embed origin. Vercel's preview toolbar can be disabled in the project settings if its scripts conflict with the app's content policy.

See [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite) for the import and SPA configuration.

## Add the subdomain

1. In the Vercel project, open **Settings → Domains** and add **hexchess.srinidhibhat.com**.
2. At the DNS provider for **srinidhibhat.com**, add the **CNAME** record for **hexchess** using the **exact target displayed by Vercel**. The target is project-specific; do not guess it.
3. Resolve any existing record for that same subdomain if the dashboard reports a conflict. Leave other subdomains and the apex domain unchanged.
4. Wait for Vercel to show valid DNS and HTTPS, then visit the custom domain.

Follow [Vercel's custom-domain instructions](https://vercel.com/docs/domains/working-with-domains/add-a-domain). DNS access is required to finish this step.

## Check the deployed app

- Start computer, pass-and-play, and link games. Each starts in zen mode; Exit zen, Z, and Esc return to the full room.
- Confirm clocks and computer responses, mobile board layout, rules, tutorial, and the video embed.
- For a shared game, use a separate device or browser profile for each player. After one move, the sender waits for the opponent’s updated link. Test the draw offer/accept exchange.
- Once the app says **Offline ready**, close other tabs for the site, switch off the network, reopen the app, and play against the computer. The video needs internet.
- Install on a phone and check the icon and standalone display.

Games and preferences are saved per origin. A game saved on localhost or a Vercel preview does not automatically migrate to the custom domain; export it and import it there. Links contain their originating hostname; generate new links on the custom domain.

## Fair-play limits

All moves are replayed and checked against the rules. Human games expose no hints, takebacks, or pause controls. Shared sessions bind normal play to one color; known replies must preserve saved history and add at most one opponent move. A draw requires an offer and a returned acceptance.

This is friendly, offline correspondence, without accounts or a trusted server. It cannot authenticate the sender, protect a first-time snapshot from editing, prevent developer-tool/local-storage modifications, or detect another chess engine. These limitations are intentional under the offline scope. Do not advertise it as cheat-proof or use it for competitive prizes.

GitHub Actions runs the same verification on pushes and pull requests. Service-worker updates activate after existing tabs close to avoid interrupting a game. The board remains in local storage across updates.
