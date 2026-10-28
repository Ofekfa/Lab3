/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.drawBackdrop();
    const hudStyle = { font: 'bold 18px monospace', color: '#2de2e6' };
    this.hud = this.add.text(18, 12, '', hudStyle).setShadow(0, 0, '#2de2e6', 10, true, true);
    this.timer = this.add.text(c.width - 18, 12, '', { ...hudStyle, color: '#ff2bd6' })
      .setOrigin(1, 0).setShadow(0, 0, '#ff2bd6', 10, true, true);
    this.halos = [];
    const playerHalo = this.add.rectangle(0, 0, 40, 40, c.colors.player, 0.18);
    this.player = this.neon(this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player, 0.35),
      playerHalo, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    const coinHalo = this.add.circle(0, 0, 18, c.colors.coin, 0.25);
    this.coin = this.neon(this.add.circle(100, 100, 9, c.colors.coin), coinHalo, c.colors.coin, 0xffffff);
    this.tweens.add({ targets: coinHalo, scale: 1.5, alpha: 0.08, duration: 600, yoyo: true, repeat: -1 });
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const halo = this.add.rectangle(0, 0, 42, 42, c.colors.drone, 0.16);
      this.tweens.add({ targets: halo, angle: 360, duration: 2400, repeat: -1 });
      const drone = this.neon(this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone, 0.3), halo, c.colors.drone);
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
  }

  drawBackdrop() {
    const c = COIN_DASH, k = c.colors, g = this.add.graphics(), hz = 230, cx = c.width / 2, C = Phaser.Display.Color;
    const mix = (a, b, t) => { const p = C.IntegerToColor(a), q = C.IntegerToColor(b);
      return C.GetColor(p.red + (q.red - p.red) * t, p.green + (q.green - p.green) * t, p.blue + (q.blue - p.blue) * t); };
    for (let y = 0; y < hz; y += 10) g.fillStyle(mix(k.skyTop, k.skyBottom, y / hz)).fillRect(0, y, c.width, 10);
    for (let i = 0; i < 40; i++) g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.8))
      .fillRect(Phaser.Math.Between(0, c.width), Phaser.Math.Between(50, hz - 120), 2, 2);
    for (let y = hz - 110; y < hz; y += 5) {
      const t = (y - hz + 110) / 110, w = Math.sqrt(110 * 110 - (hz - y) ** 2);
      if (t < 0.5 || (y / 5) % 3 !== 0) g.fillStyle(mix(k.sunTop, k.sunBottom, t)).fillRect(cx - w, y, w * 2, 5);
    }
    g.fillStyle(k.ground).fillRect(0, hz, c.width, c.height - hz);
    g.lineStyle(1, k.grid, 0.45);
    for (let i = -14; i <= 14; i++) g.lineBetween(cx + i * 30, hz, cx + i * 150, c.height);
    for (let t = 0.1; t < 1; t += 0.1) g.lineBetween(0, hz + (c.height - hz) * t * t, c.width, hz + (c.height - hz) * t * t);
    g.lineStyle(2, k.horizon, 0.9).lineBetween(0, hz, c.width, hz);
    g.fillStyle(k.hud, 0.85).fillRect(0, 0, c.width, 44);
    g.lineStyle(6, k.grid, 0.2).lineBetween(0, 45, c.width, 45);
    g.lineStyle(2, k.grid, 1).lineBetween(0, 44, c.width, 44);
  }

  neon(obj, halo, color, stroke = color) {
    obj.setStrokeStyle(2, stroke, 1);
    if (obj.postFX) obj.postFX.addGlow(color, 4, 0, false, 0.1, 12);
    halo.setPosition(obj.x, obj.y);
    this.halos.push([obj, halo]);
    return obj;
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
    this.halos.forEach(([obj, halo]) => halo.setPosition(obj.x, obj.y));
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`COINS ${String(this.score).padStart(2, '0')}`);
    this.timer.setText(`TIME ${String(seconds).padStart(2, '0')}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 480, 170, c.colors.panelEdge, 0.18);
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, c.colors.panel, 0.95)
      .setStrokeStyle(2, c.colors.panelEdge);
    this.add.text(c.width / 2, c.height / 2,
      `${reason.toUpperCase()}\n${this.score} coins collected\nPress R to try again`,
      { font: 'bold 24px monospace', color: '#ffe94d', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5).setShadow(0, 0, '#ff2bd6', 14, true, true);
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
