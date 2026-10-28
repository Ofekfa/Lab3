/* global Phaser, COIN_DASH */
const ui = (size, color, fontStyle = '') => ({ fontFamily: 'system-ui, "Segoe UI", sans-serif', fontSize: size + 'px', fontStyle, color });
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH, k = c.colors;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.makeTextures();
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40, k.background, 1, k.grid, 0.6);
    const bar = this.add.graphics().setDepth(10);
    bar.fillStyle(k.shadow, 0.08).fillRoundedRect(10, 9, c.width - 20, 30, 15);
    bar.fillStyle(k.panel, 0.92).fillRoundedRect(10, 6, c.width - 20, 30, 15);
    const font = ui(18, k.text, 'bold');
    this.hud = this.add.text(28, 10, '', font).setDepth(11);
    this.hudTime = this.add.text(c.width - 28, 10, '', font).setOrigin(1, 0).setDepth(11);
    // Physics objects stay as the original (now hidden) shapes; separate images draw the look.
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, k.player).setVisible(false);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.art = this.decorate('cd-player', 4);
    this.coin = this.add.circle(100, 100, 9, k.coin).setVisible(false);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.coin.art = this.decorate('cd-coin', 2);
    this.coinBob = { y: 0 };
    this.tweens.add({ targets: this.coinBob, y: -4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.coin.art, scaleX: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, k.drone).setVisible(false);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
      drone.art = this.decorate('cd-drone', 3);
      this.tweens.add({ targets: drone.art, angle: { from: -7, to: 7 }, duration: 600 + i * 90,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.events.on('postupdate', this.syncArt, this);
    this.events.once('shutdown', () => this.events.off('postupdate', this.syncArt, this));
    this.syncArt();
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.pop(this.coin.x, this.coin.y);
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  makeTextures() {
    if (this.textures.exists('cd-player')) return;
    const k = COIN_DASH.colors, g = this.make.graphics({ add: false });
    g.fillStyle(k.shadow, 0.18).fillEllipse(15, 5, 28, 9).generateTexture('cd-shadow', 30, 10).clear();
    g.fillStyle(k.player).fillRoundedRect(2, 2, 24, 24, 8).lineStyle(2, k.playerEdge).strokeRoundedRect(2, 2, 24, 24, 8);
    g.fillStyle(k.playerEdge).fillCircle(10, 12, 2).fillCircle(18, 12, 2);
    g.fillStyle(0xffffff, 0.45).fillRoundedRect(6, 5, 10, 4, 2).generateTexture('cd-player', 28, 28).clear();
    g.fillStyle(k.coinEdge).fillCircle(11, 11, 10).fillStyle(k.coin).fillCircle(11, 11, 7.5);
    g.fillStyle(k.coinShine, 0.9).fillEllipse(8, 7, 6, 3.5).generateTexture('cd-coin', 22, 22).clear();
    g.fillStyle(k.drone).fillRoundedRect(3, 3, 26, 26, 9).lineStyle(3, k.droneEdge).strokeRoundedRect(3, 3, 26, 26, 9);
    g.fillStyle(0xffffff).fillCircle(11, 17, 4).fillCircle(21, 17, 4);
    g.fillStyle(k.droneEdge).fillCircle(12, 18, 2).fillCircle(20, 18, 2);
    g.lineStyle(2.5, k.droneEdge).lineBetween(7, 10, 14, 13).lineBetween(25, 10, 18, 13);
    g.generateTexture('cd-drone', 32, 32).destroy();
  }

  decorate(key, depth) {
    const art = this.add.image(0, 0, key).setDepth(depth);
    art.shadow = this.add.image(0, 0, 'cd-shadow').setDepth(1);
    return art;
  }

  syncArt() {
    const follow = (o, lift = 0) => {
      o.art.setPosition(o.x, o.y + lift);
      o.art.shadow.setPosition(o.x, o.y + o.height / 2 + 5).setScale(o.width / 26 + lift / 30);
    };
    follow(this.player);
    follow(this.coin, this.coinBob.y);
    this.drones.getChildren().forEach(d => follow(d));
  }

  pop(x, y) {
    const k = COIN_DASH.colors;
    const ring = this.add.circle(x, y, 10).setStrokeStyle(3, k.coinEdge).setDepth(5);
    this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    const plus = this.add.text(x, y - 10, '+1', ui(16, k.text, 'bold')).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: plus, y: y - 36, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => plus.destroy() });
    this.tweens.add({ targets: this.player.art, scale: 1.18, duration: 90, yoyo: true });
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
    this.hud.setText(`Coins: ${this.score}`);
    this.hudTime.setText(`Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH, k = c.colors;
    this.add.rectangle(c.width / 2, c.height / 2, c.width, c.height, k.background, 0.55).setDepth(19);
    const card = this.add.container(c.width / 2, c.height / 2).setDepth(20);
    const g = this.add.graphics();
    g.fillStyle(k.shadow, 0.14).fillRoundedRect(-226, -79, 460, 170, 22);
    g.fillStyle(k.panel).fillRoundedRect(-230, -85, 460, 170, 22).lineStyle(2, k.panelEdge).strokeRoundedRect(-230, -85, 460, 170, 22);
    const text = (y, s, ...style) => this.add.text(0, y, s, ui(...style)).setOrigin(0.5);
    card.add([g,
      text(-42, reason, 26, k.text, 'bold'),
      text(2, `${this.score} coins collected`, 22, k.text),
      text(46, 'Press R to try again', 17, k.textSoft)
    ]).setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
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
