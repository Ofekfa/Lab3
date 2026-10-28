// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },
  powerUps: {
    shield: { color: 0x4cc9f0, duration: 6, spawnEvery: 10, lifetime: 7 },
    speed: { color: 0x80ed6a, duration: 5, multiplier: 1.7, spawnEvery: 10, lifetime: 7 },
    freeze: { color: 0xbde0fe, duration: 4, spawnEvery: 12, lifetime: 7 }
  }
};
