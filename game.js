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
    this.createShield();
    this.physics.add.overlap(this.player, this.drones, () => this.shieldActive() || this.finish('A drone caught you!'));
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
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
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
    this.shieldText = this.add.text(330, 12, '', { font: '16px monospace', color: '#4cc9f0' });
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
