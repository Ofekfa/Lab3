// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  lives: 3,
  hitInvulnerable: 1.5,
  combo: { window: 2, max: 3 },
  difficulty: { coinsPerLevel: 10, speedUp: 1.15, maxDrones: 6 },
  goldenCoin: { value: 5, spawnEvery: 9, lifetime: 3 },
  highScoreKey: 'coinDash.highScores',
  highScoreCount: 5,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  coinSoundVolume: 0.15,
  sfxVolume: 0.15,
  musicVolume: 0.05,
  musicBpm: 140,
  countdownSeconds: 5,
  colors: {
    background: 0x07071a, grid: 0x1c1c4a, hudLine: 0x3cff3c, scanline: 0x000000, panel: 0x000000,
    coin: 0xffd800, coinLight: 0xffffff, coinShade: 0xd86a00,
    drone: 0xff3c6e, droneEye: 0xffffff,
    hud: '#3cff3c', hudAlt: '#ffd800', alert: '#ff3c6e', text: '#ffffff'
  },
  characters: [
    { id: 'blip', name: 'BLIP', color: 0x3cff3c, dark: 0x0a5a0a },
    { id: 'robo', name: 'ROBO', color: 0xb8b8d0, dark: 0x3a3a55 },
    { id: 'whiskers', name: 'WHISKERS', color: 0xff9f1c, dark: 0x6b3500 },
    { id: 'goo', name: 'GOO', color: 0xc77dff, dark: 0x3c1361 }
  ],
  powerUps: {
    shield: { color: 0x4cc9f0, duration: 6, spawnEvery: 10, lifetime: 7 },
    speed: { color: 0x80ed6a, duration: 5, multiplier: 1.7, spawnEvery: 10, lifetime: 7 },
    freeze: { color: 0xbde0fe, duration: 4, spawnEvery: 12, lifetime: 7 }
  }
};
