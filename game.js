/* global Phaser, COIN_DASH */
// Pixel sprites: [pixel size, ...rows]; texture sizes match the physics bodies (24, 18, 26).
const SPRITES = {
  player: [3, '..GGGG..', '.GGGGGG.', 'GGKGGKGG', 'GGKGGKGG', 'GGGGGGGG', 'GKGGGGKG', '.GKKKKG.', '..GGGG..'],
  coin: [3, '.YYYY.', 'YWYYYY', 'YWYOYY', 'YYYOYO', 'YYYYYO', '.OOOO.'],
  drone: [2, '..R.......R..', '...R.....R...', '..RRRRRRRRR..', '.RRRRRRRRRRR.', 'RRREERRREERRR',
    'RRREERRREERRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', '.RRR.....RRR.', '..RRRRRRRRR..',
    '..R.R...R.R..', '.R..R...R..R.', 'R..R.....R..R']
};
const FONT = '"Courier New", Courier, monospace';

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  makeTextures() {
    const k = COIN_DASH.colors;
    const pal = { G: k.player, K: k.playerDark, Y: k.coin, W: k.coinLight, O: k.coinShade, R: k.drone, E: k.droneEye };
    for (const [key, [px, ...rows]] of Object.entries(SPRITES)) {
      if (this.textures.exists(key)) continue;
      const g = this.make.graphics({ add: false });
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch in pal) g.fillStyle(pal[ch]).fillRect(x * px, y * px, px, px);
      }));
      g.generateTexture(key, rows[0].length * px, rows.length * px);
      g.destroy();
    }
  }

  create() {
    const c = COIN_DASH;
    this.makeTextures();
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, c.colors.grid, 0.6);
    this.add.rectangle(c.width / 2, 22, c.width, 44, c.colors.panel);
    this.add.rectangle(c.width / 2, 43, c.width, 2, c.colors.hudLine);
    const hud = { font: `bold 20px ${FONT}`, color: c.colors.hud };
    this.hud = this.add.text(18, 12, '', hud);
    this.add.text(c.width / 2, 12, 'COIN DASH', { ...hud, color: c.colors.alert }).setOrigin(0.5, 0);
    this.timer = this.add.text(c.width - 18, 12, '', { ...hud, color: c.colors.hudAlt }).setOrigin(1, 0);
    this.player = this.physics.add.image(c.width / 2, c.height / 2, 'player');
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.image(100, 100, 'coin');
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.tweens.add({ targets: this.coin, alpha: 0.55, duration: 200, yoyo: true, repeat: -1, hold: 300 });
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.image(90 + i * 270, 100, 'drone');
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    const scan = this.add.graphics().setDepth(10).fillStyle(c.colors.scanline, 0.25);
    for (let y = 0; y < c.height; y += 4) scan.fillRect(0, y, c.width, 2);
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A DRONE CAUGHT YOU!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`SCORE ${String(this.score).padStart(4, '0')}`);
    this.timer.setText(`TIME ${String(seconds).padStart(2, '0')}`);
    if (seconds === 0) this.finish('TIME IS UP!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH, cx = c.width / 2, cy = c.height / 2;
    this.add.rectangle(cx, cy, 472, 212, c.colors.panel, 0.92).setStrokeStyle(4, c.colors.hudLine);
    this.add.text(cx, cy - 58, 'GAME OVER', { font: `bold 44px ${FONT}`, color: c.colors.alert }).setOrigin(0.5);
    this.add.text(cx, cy + 4, `${reason}\nSCORE ${String(this.score).padStart(4, '0')}`,
      { font: `bold 22px ${FONT}`, color: c.colors.text, align: 'center', lineSpacing: 8 }).setOrigin(0.5);
    const retry = this.add.text(cx, cy + 70, 'PRESS R TO PLAY AGAIN',
      { font: `bold 20px ${FONT}`, color: c.colors.hudAlt }).setOrigin(0.5);
    this.tweens.add({ targets: retry, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  pixelArt: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
