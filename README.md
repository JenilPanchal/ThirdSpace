# ThirdSpace

An internet bench where friends and new faces share music, make art, and reflect on their day. ThirdSpace brings a shared garden to Fire TV with customizable avatars and three benches.

## The benches

- **Jukebox:** Join a room, share its code, and contribute YouTube videos to a shared listening queue. Direct links work without a search API key; song search is available when configured.
- **Potrait:** Collaborate on a 32 × 24 pixel canvas with 16 colors. Each player gets two placements per minute, enforced by the server.
- **Bee:** Choose a guided speaker-label review or a source-linked mind map of a class or meeting. Explore the labeled sample now, or connect a Bee account later.

## Stack

- React Native 0.83 and React 19.2 for Amazon Vega / Fire TV
- Native shapes for avatars and garden artwork
- Node.js room server for shared presence, queues, and pixel art
- YouTube embedded playback and optional Data API search
- Official Bee CLI integration on the host computer

## Run locally

The application lives in `hello-world/`. Install the Vega SDK and use Node.js 20.6 or later.

```sh
cd hello-world
npm ci
npm run room:server
```

In another terminal, load the Vega SDK environment and build the app:

```sh
source ~/vega/env
npm run build:debug
vega virtual-device start
vega device install-app --dir . -b Debug
vega device launch-app --dir .
```

The simulator uses `http://10.0.2.2:8787` for the room server. Other devices on the same Wi-Fi use the host computer's address printed by the server. The browser companion lets participants join music queues and paint on the shared canvas.

The preview login accepts a display name and a password of at least four characters. It does not create an account or store the password.

## Optional services

Copy `.env.example` to `.env.local` inside `hello-world/` and configure only the services you need. Never commit credentials.

```sh
node --env-file=.env.local server/room-server.mjs
```

- [Room server and YouTube setup](hello-world/server/QUICKSTART.txt)
- [Bee connection, privacy, and review setup](hello-world/server/bee/SETUP.txt)

Bee uses a separate private pairing session. Recordings are not included in shared room snapshots. Speaker corrections are stored locally in ThirdSpace and do not modify Bee's original transcripts. Maps are transcript-based drafts unless optional Bee-agent generation is enabled for an eligible account.

## Validation

```sh
cd hello-world
npm test -- --runInBand --watchman=false
npm run room:test
npx tsc --noEmit
npm run build:debug
```

## Current preview limits

Shared rooms, queues, and canvas artwork are held in memory and reset when the server restarts. Sharing currently targets a local Wi-Fi network; public hosting, persistent community artwork, production authentication, and moderation are future work. Real Bee wearable authentication and live agent responses require account setup.
