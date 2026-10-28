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
    this.timer = this.add.text(c.width - 18, 12, '', { ...hud, color: c.colors.hudAlt }).setOrigin(1, 0);
    this.highScore = this.loadHighScore();
    this.best = this.add.text(c.width - 120, 12, `HI ${String(this.highScore).padStart(4, '0')}`,
      { ...hud, color: c.colors.text }).setOrigin(1, 0);
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
    this.createShield();
    this.physics.add.overlap(this.player, this.drones, () => this.shieldActive() || this.finish('A DRONE CAUGHT YOU!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.createSpeed();
    this.createFreeze();
  }

  createSpeed() {
    const s = COIN_DASH.powerUps.speed;
    this.speedUntil = 0;
    this.speedPickupUntil = 0;
    this.speedNextSpawn = this.time.now + s.spawnEvery * 1000;
    this.speedText = this.add.text(340, 14, '', { font: `bold 16px ${FONT}`, color: '#80ed6a' });
    this.speedPickup = this.add.triangle(0, 0, 0, 20, 10, 0, 20, 20, s.color).setVisible(false);
    this.physics.add.existing(this.speedPickup);
    this.speedPickup.body.enable = false;
    this.physics.add.overlap(this.player, this.speedPickup, () => this.collectSpeed());
  }

  spawnSpeed() {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.speedPickup.setPosition(x, y).setVisible(true);
    this.speedPickup.body.enable = true;
    this.speedPickup.body.reset(x, y);
    this.speedPickupUntil = this.time.now + c.powerUps.speed.lifetime * 1000;
  }

  hideSpeedPickup() {
    this.speedPickup.setVisible(false);
    this.speedPickup.body.enable = false;
    this.speedNextSpawn = this.time.now + COIN_DASH.powerUps.speed.spawnEvery * 1000;
  }

  collectSpeed() {
    if (this.finished || !this.speedPickup.visible) return;
    this.hideSpeedPickup();
    this.speedUntil = this.time.now + COIN_DASH.powerUps.speed.duration * 1000;
    this.player.setTint(COIN_DASH.powerUps.speed.color);
  }

  updateSpeed() {
    const now = this.time.now;
    if (this.speedPickup.visible && now >= this.speedPickupUntil) this.hideSpeedPickup();
    else if (!this.speedPickup.visible && now >= this.speedNextSpawn) this.spawnSpeed();
    if (this.speedUntil && now >= this.speedUntil) {
      this.speedUntil = 0;
      this.player.clearTint();
    }
    this.speedText.setText(this.speedUntil ? `SPEED ${Math.ceil((this.speedUntil - now) / 1000)}s` : '');
  }

  playerSpeed() {
    const s = COIN_DASH.powerUps.speed;
    return COIN_DASH.playerSpeed * (this.time.now < this.speedUntil ? s.multiplier : 1);
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
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.playerSpeed());
    this.player.body.setVelocity(direction.x, direction.y);
    this.updateSpeed();
    this.updateFreeze();
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`SCORE ${String(this.score).padStart(4, '0')}`);
    this.timer.setText(`TIME ${String(seconds).padStart(2, '0')}`);
    if (seconds === 0) this.finish('TIME IS UP!');
    this.updateShield();
  }

  createShield() {
    const s = COIN_DASH.powerUps.shield;
    this.shieldUntil = 0;
    this.nextShieldAt = this.time.now + s.spawnEvery * 1000;
    this.shieldPickup = this.add.rectangle(0, 0, 18, 18, s.color).setAngle(45).setVisible(false);
    this.physics.add.existing(this.shieldPickup);
    this.shieldPickup.body.enable = false;
    this.shieldRing = this.add.circle(0, 0, 22).setStrokeStyle(3, s.color).setVisible(false);
    this.shieldText = this.add.text(200, 14, '', { font: `bold 16px ${FONT}`, color: '#4cc9f0' });
    this.physics.add.overlap(this.player, this.shieldPickup, () => this.collectShield());
  }

  spawnShield() {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.shieldPickup.setPosition(x, y).setVisible(true);
    this.shieldPickup.body.enable = true;
    this.shieldPickup.body.reset(x, y);
    this.shieldPickupUntil = this.time.now + c.powerUps.shield.lifetime * 1000;
  }

  hideShieldPickup() {
    this.shieldPickup.setVisible(false);
    this.shieldPickup.body.enable = false;
    this.nextShieldAt = this.time.now + COIN_DASH.powerUps.shield.spawnEvery * 1000;
  }

  collectShield() {
    if (this.finished || !this.shieldPickup.visible) return;
    this.hideShieldPickup();
    this.shieldUntil = this.time.now + COIN_DASH.powerUps.shield.duration * 1000;
  }

  shieldActive() { return this.time.now < this.shieldUntil; }

  updateShield() {
    if (this.finished) return;
    const now = this.time.now;
    if (this.shieldPickup.visible && now >= this.shieldPickupUntil) this.hideShieldPickup();
    else if (!this.shieldPickup.visible && now >= this.nextShieldAt) this.spawnShield();
    const left = this.shieldUntil - now;
    this.shieldRing.setPosition(this.player.x, this.player.y)
      .setVisible(left > 0 && (left > 1500 || Math.floor(left / 125) % 2 === 0));
    this.shieldText.setText(left > 0 ? `SHIELD ${Math.ceil(left / 1000)}s` : '');
  }

  createFreeze() {
    const f = COIN_DASH.powerUps.freeze;
    this.freezeUntil = 0;
    this.freezeSaved = null;
    this.freezePickupUntil = 0;
    this.nextFreezeAt = this.time.now + f.spawnEvery * 1000;
    this.freezePickup = this.add.star(0, 0, 6, 5, 11, f.color).setVisible(false);
    this.physics.add.existing(this.freezePickup);
    this.freezePickup.body.enable = false;
    this.freezeText = this.add.text(480, 14, '', { font: `bold 16px ${FONT}`, color: '#bde0fe' });
    this.physics.add.overlap(this.player, this.freezePickup, () => this.collectFreeze());
  }

  spawnFreeze() {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.freezePickup.setPosition(x, y).setVisible(true);
    this.freezePickup.body.enable = true;
    this.freezePickup.body.reset(x, y);
    this.freezePickupUntil = this.time.now + c.powerUps.freeze.lifetime * 1000;
  }

  hideFreeze() {
    this.freezePickup.setVisible(false);
    this.freezePickup.body.enable = false;
    this.nextFreezeAt = this.time.now + COIN_DASH.powerUps.freeze.spawnEvery * 1000;
  }

  collectFreeze() {
    if (this.finished || !this.freezePickup.visible) return;
    this.hideFreeze();
    this.freezeUntil = this.time.now + COIN_DASH.powerUps.freeze.duration * 1000;
    if (this.freezeSaved) return;
    this.freezeSaved = this.drones.getChildren().map(d => {
      const saved = { drone: d, vx: d.body.velocity.x, vy: d.body.velocity.y };
      d.body.setVelocity(0, 0);
      d.setTint(COIN_DASH.powerUps.freeze.color);
      return saved;
    });
  }

  updateFreeze() {
    if (this.finished) return;
    const now = this.time.now;
    if (this.freezePickup.visible && now >= this.freezePickupUntil) this.hideFreeze();
    else if (!this.freezePickup.visible && now >= this.nextFreezeAt) this.spawnFreeze();
    if (this.freezeSaved && now >= this.freezeUntil) {
      this.freezeSaved.forEach(s => { s.drone.body.setVelocity(s.vx, s.vy); s.drone.clearTint(); });
      this.freezeSaved = null;
    }
    this.freezeText.setText(this.freezeSaved ? `FREEZE ${Math.ceil((this.freezeUntil - now) / 1000)}s` : '');
  }

  loadHighScore() {
    // Storage can be unavailable (private windows, some file:// setups); fall back to 0.
    try { return Number(localStorage.getItem('coinDash.highScore')) || 0; } catch { return 0; }
  }

  saveHighScore() {
    if (this.score <= this.highScore) return false;
    this.highScore = this.score;
    this.best.setText(`HI ${String(this.highScore).padStart(4, '0')}`);
    try { localStorage.setItem('coinDash.highScore', String(this.highScore)); } catch { /* not persisted */ }
    return true;
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    // Power-up pickups and timers would otherwise stay frozen on top of the end screen.
    [this.shieldPickup, this.speedPickup, this.freezePickup, this.shieldRing].forEach(o => o.setVisible(false));
    [this.shieldText, this.speedText, this.freezeText].forEach(t => t.setText(''));
    const c = COIN_DASH, cx = c.width / 2, cy = c.height / 2;
    const best = this.saveHighScore() ? 'NEW HIGH SCORE!' : `HI ${String(this.highScore).padStart(4, '0')}`;
    this.add.rectangle(cx, cy, 472, 240, c.colors.panel, 0.92).setStrokeStyle(4, c.colors.hudLine);
    this.add.text(cx, cy - 72, 'GAME OVER', { font: `bold 44px ${FONT}`, color: c.colors.alert }).setOrigin(0.5);
    this.add.text(cx, cy + 4, `${reason}\nSCORE ${String(this.score).padStart(4, '0')}\n${best}`,
      { font: `bold 22px ${FONT}`, color: c.colors.text, align: 'center', lineSpacing: 8 }).setOrigin(0.5);
    const retry = this.add.text(cx, cy + 84, 'PRESS R TO PLAY AGAIN',
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
