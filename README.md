# Coin Dash — Lab 3 starter

Collect coins, avoid drones, and survive a 45-second round. Move with arrow keys or WASD;
press R to restart. This is deliberately small so you can add features during the lab.
Before each round, choose one of four characters (BLIP, ROBO, WHISKERS, GOO) with the arrow keys and
Enter, or by clicking; R replays with the same character and C on the game-over screen picks again.
You have 3 lives: a drone hit costs one and gives 1.5 seconds of flashing invulnerability.
Coins grabbed within 2 seconds of each other build a combo (x2, then x3 points); pausing resets it.
A big blinking golden coin appears every few seconds and is worth 5 points, but vanishes after 3 seconds.
Every 10 coins the level goes up: drones get 15% faster and a new drone joins (up to 6).
The game-over screen shows the top 5 scores (saved in your browser) and flashes NEW HIGH SCORE! when you beat the best.
Grab the cyan diamond for a 6-second shield that makes you immune to drones.
Grab the green triangle power-up for a 5-second speed boost (x1.7).
Grab the ice-blue star power-up to freeze all drones for 4 seconds (touching a frozen drone still ends the round).

**Play it here:** https://www.avivz.net/coin-dash/

## Run it locally

Clone the repository and open `index.html` in a browser. Everything is in the repository;
there is no package to install, no build step, no backend, and nothing is fetched from the network.
If your agent prefers a local server, let it serve this folder, for example with
`python3 -m http.server 8000`, and open `http://localhost:8000`.

## Use it in the lab

This is a template repository. One partner creates the pair's own repository from it
(the **Use this template** button, or `gh repo create <name> --template avivz/coin-dash --public --clone`)
and adds the other partner as a collaborator. Both clone it and open `index.html`.

## Lab report

The repository includes a `lab-report` skill: use `/lab-report` in Claude Code or `$lab-report`
in Codex, for the pre-lab practice run and at the end of the lab. Give it your name, a unique
laptop label, and the session's start and end times with timezone. If it is not listed, ask
your agent to read `.claude/skills/lab-report/SKILL.md` and follow it.

The skill writes a JSON export and a report page under `reports/`, which Git ignores.
Open that page, load your JSON, and check the result. For the final pair report, load both
laptops' JSON files together and save the combined HTML. Use the same time window on both laptops.

## Files

- `.claude/skills/lab-report/`: reporting skill and offline HTML page.
- `.agents/skills/lab-report`: link to the same skill for Codex.
- `.gitignore`: keeps generated reports out of Git.
- `index.html`: page and script loading.
- `style.css`: page appearance.
- `settings.js`: round duration, speeds, colours and dimensions.
- `game.js`: scene, input, collisions, score and end-of-round behaviour.
- `designs/neon/`, `designs/pastel/`: alternative visual designs kept for comparison (the game runs the retro
  design). Each is a snapshot from before the power-ups; open its `index.html` to view it.
- `vendor/phaser-3.90.0.min.js`: the pinned Phaser runtime, byte for byte the file published at
  `https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js`; `vendor/LICENSE.phaser.txt` is its MIT licence.

The game draws its own shapes; there are no image or audio assets. The authored files are under the
MIT licence in LICENSE.txt. Phaser documentation:
https://docs.phaser.io/phaser/getting-started/making-your-first-phaser-game

## Team

- Ofek (Ofekfa)
- David (olidortd)

## Lab session

Use this window on both laptops for the lab report.

- Start: 2026-10-28 10:10 Israel Standard Time (`2026-10-28T10:10:00+02:00`, `08:10Z`)
- End: 2026-10-28 11:40 Israel Standard Time (`2026-10-28T11:40:00+02:00`, `09:40Z`)
