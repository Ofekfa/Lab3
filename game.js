/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.createFreeze();
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
    this.updateFreeze();
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
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
    this.freezeText = this.add.text(610, 12, '', { font: '16px monospace', color: '#bde0fe' });
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
      const saved = { drone: d, vx: d.body.velocity.x, vy: d.body.velocity.y, color: d.fillColor };
      d.body.setVelocity(0, 0);
      d.setFillStyle(COIN_DASH.powerUps.freeze.color);
      return saved;
    });
  }

  updateFreeze() {
    if (this.finished) return;
    const now = this.time.now;
    if (this.freezePickup.visible && now >= this.freezePickupUntil) this.hideFreeze();
    else if (!this.freezePickup.visible && now >= this.nextFreezeAt) this.spawnFreeze();
    if (this.freezeSaved && now >= this.freezeUntil) {
      this.freezeSaved.forEach(s => { s.drone.body.setVelocity(s.vx, s.vy); s.drone.setFillStyle(s.color); });
      this.freezeSaved = null;
    }
    this.freezeText.setText(this.freezeSaved ? `FREEZE ${Math.ceil((this.freezeUntil - now) / 1000)}s` : '');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
