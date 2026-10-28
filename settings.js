// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: {
    background: 0x07071a, grid: 0x1c1c4a, hudLine: 0x3cff3c, scanline: 0x000000, panel: 0x000000,
    player: 0x3cff3c, playerDark: 0x0a5a0a,
    coin: 0xffd800, coinLight: 0xffffff, coinShade: 0xd86a00,
    drone: 0xff3c6e, droneEye: 0xffffff,
    hud: '#3cff3c', hudAlt: '#ffd800', alert: '#ff3c6e', text: '#ffffff'
  }
};
