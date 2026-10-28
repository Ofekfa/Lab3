/* global Phaser, COIN_DASH */
// Pixel sprites: [pixel size, ...rows]; texture sizes match the physics bodies (24, 18, 26).
const SPRITES = {
  coin: [3, '.YYYY.', 'YWYYYY', 'YWYOYY', 'YYYOYO', 'YYYYYO', '.OOOO.'],
  drone: [2, '..R.......R..', '...R.....R...', '..RRRRRRRRR..', '.RRRRRRRRRRR.', 'RRREERRREERRR',
    'RRREERRREERRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', '.RRR.....RRR.', '..RRRRRRRRR..',
    '..R.R...R.R..', '.R..R...R..R.', 'R..R.....R..R']
};
// Player characters (24x24, same hitbox): G = main colour, K = dark colour, E = eye white.
const CHARACTER_SPRITES = {
  blip: [3, '..GGGG..', '.GGGGGG.', 'GGKGGKGG', 'GGKGGKGG', 'GGGGGGGG', 'GKGGGGKG', '.GKKKKG.', '..GGGG..'],
  robo: [3, '..K..K..', '.GGGGGG.', 'GGEGGEGG', 'GGKGGKGG', 'GGGGGGGG', 'GKKKKKKG', '.GGGGGG.', '.G....G.'],
  whiskers: [3, 'G......G', 'GG....GG', 'GGGGGGGG', 'GEKGGEKG', 'GGGKKGGG', 'GGKGGKGG', '.GGGGGG.', '..GGGG..'],
  goo: [3, '...GG...', '..GGGG..', '.GGGGGG.', 'GGEGGEGG', 'GGKGGKGG', 'GGGGGGGG', 'GGKKKKGG', 'G.GG.GG.']
};
const FONT = '"Courier New", Courier, monospace';
// Background loop as MIDI notes, one per eighth note (Am F C G); 0 is a rest.
const MUSIC = {
  bass: [45, 57, 45, 57, 45, 57, 45, 57, 41, 53, 41, 53, 41, 53, 41, 53,
    48, 60, 48, 60, 48, 60, 48, 60, 43, 55, 43, 55, 43, 55, 47, 55],
  lead: [69, 0, 72, 76, 0, 76, 74, 72, 69, 0, 72, 77, 0, 77, 76, 74,
    72, 0, 76, 79, 0, 79, 77, 76, 74, 0, 71, 74, 79, 0, 74, 71]
};
const midiHz = n => 440 * 2 ** ((n - 69) / 12);

function drawSprite(scene, key, [px, ...rows], pal) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch in pal) g.fillStyle(pal[ch]).fillRect(x * px, y * px, px, px);
  }));
  g.generateTexture(key, rows[0].length * px, rows.length * px);
  g.destroy();
}

function makeCharacterTextures(scene) {
  COIN_DASH.characters.forEach(ch =>
    drawSprite(scene, `player-${ch.id}`, CHARACTER_SPRITES[ch.id], { G: ch.color, K: ch.dark, E: 0xffffff }));
}

// Absolute this.time.now timestamps on CoinDash that togglePause shifts when the game resumes.
const PAUSABLE_TIMERS = ['deadline', 'invulnerableUntil', 'lastCoinAt', 'goldenUntil', 'nextGoldenAt',
  'speedUntil', 'speedPickupUntil', 'speedNextSpawn', 'shieldUntil', 'shieldPickupUntil', 'nextShieldAt',
  'freezeUntil', 'freezePickupUntil', 'nextFreezeAt'];

class CharacterSelect extends Phaser.Scene {
  constructor() { super('CharacterSelect'); }

  create() {
    const c = COIN_DASH, chars = c.characters;
    makeCharacterTextures(this);
    this.choice = this.registry.get('character') ?? 0;
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40, c.colors.background, 1, c.colors.grid, 0.6);
    this.add.text(c.width / 2, 80, 'CHOOSE YOUR CHARACTER',
      { font: `bold 36px ${FONT}`, color: c.colors.alert }).setOrigin(0.5);
    const gap = 180, left = c.width / 2 - gap * (chars.length - 1) / 2;
    this.cards = chars.map((ch, i) => {
      const x = left + i * gap, y = 250;
      const box = this.add.rectangle(x, y, 150, 190, c.colors.panel, 0.85).setStrokeStyle(4, c.colors.grid)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => { this.select(i); this.start(); });
      this.add.image(x, y - 25, `player-${ch.id}`).setScale(3);
      this.add.text(x, y + 60, ch.name, { font: `bold 20px ${FONT}`, color: c.colors.text }).setOrigin(0.5);
      return box;
    });
    const hint = this.add.text(c.width / 2, 420, '← → TO CHOOSE · ENTER TO START',
      { font: `bold 20px ${FONT}`, color: c.colors.hudAlt }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
    const scan = this.add.graphics().setDepth(10).fillStyle(c.colors.scanline, 0.25);
    for (let y = 0; y < c.height; y += 4) scan.fillRect(0, y, c.width, 2);
    const move = d => this.select((this.choice + d + chars.length) % chars.length);
    ['LEFT', 'A'].forEach(k => this.input.keyboard.on(`keydown-${k}`, () => move(-1)));
    ['RIGHT', 'D'].forEach(k => this.input.keyboard.on(`keydown-${k}`, () => move(1)));
    ['ENTER', 'SPACE'].forEach(k => this.input.keyboard.on(`keydown-${k}`, () => this.start()));
    this.select(this.choice);
  }

  select(i) {
    this.choice = i;
    this.cards.forEach((box, j) => box.setStrokeStyle(4, j === i ? COIN_DASH.colors.hudLine : COIN_DASH.colors.grid));
  }

  start() {
    this.registry.set('character', this.choice);
    this.scene.start('CoinDash');
  }
}

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  makeTextures() {
    const k = COIN_DASH.colors;
    const pal = { Y: k.coin, W: k.coinLight, O: k.coinShade, R: k.drone, E: k.droneEye };
    for (const [key, sprite] of Object.entries(SPRITES)) drawSprite(this, key, sprite, pal);
    makeCharacterTextures(this);
  }

  create() {
    const c = COIN_DASH;
    this.makeTextures();
    this.score = 0;
    this.finished = false;
    this.lives = c.lives;
    this.invulnerableUntil = 0;
    this.combo = 0;
    this.lastCoinAt = -Infinity;
    this.coinsCollected = 0;
    this.level = 1;
    this.droneSpeed = c.droneSpeed;
    this.paused = false;
    this.lastSecond = null;
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
    this.livesText = this.add.text(c.width - 220, 12, '♥'.repeat(this.lives), { ...hud, color: c.colors.alert }).setOrigin(1, 0);
    this.character = c.characters[this.registry.get('character') ?? 0];
    this.player = this.physics.add.image(c.width / 2, c.height / 2, `player-${this.character.id}`);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.image(100, 100, 'coin');
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.tweens.add({ targets: this.coin, alpha: 0.55, duration: 200, yoyo: true, repeat: -1, hold: 300 });
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) this.addDrone(90 + i * 270, 100, (35 + i * 105) * Math.PI / 180);
    const scan = this.add.graphics().setDepth(10).fillStyle(c.colors.scanline, 0.25);
    for (let y = 0; y < c.height; y += 4) scan.fillRect(0, y, c.width, 2);
    this.physics.add.overlap(this.player, this.coin, () => this.collectCoin());
    this.createShield();
    this.physics.add.overlap(this.player, this.drones, () => this.hitPlayer());
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R,P');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-C', () => this.finished && this.scene.start('CharacterSelect'));
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.pauseText = this.add.text(c.width / 2, (c.height + 44) / 2, 'PAUSED\nPRESS P TO RESUME',
      { font: `bold 28px ${FONT}`, color: c.colors.hudAlt, align: 'center', lineSpacing: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.85)', padding: { x: 28, y: 18 } }
    ).setOrigin(0.5).setDepth(20).setVisible(false);
    this.createSpeed();
    this.createFreeze();
    this.createGolden();
    this.createJuice();
    this.startMusic();
    this.events.once('shutdown', () => this.stopMusic());
    this.powerBars = this.add.graphics().setDepth(5);
    this.comboBar = this.add.graphics();
  }

  updateComboBar() {
    // Shrinking bar under the HUD's xN showing how long the combo window has left.
    const left = this.lastCoinAt + COIN_DASH.combo.window * 1000 - this.time.now;
    this.comboBar.clear();
    if (!this.comboActive()) return;
    const w = 24, x = this.hud.x + this.hud.width - w;
    this.comboBar.fillStyle(COIN_DASH.colors.drone).fillRect(x, 36, w * left / (COIN_DASH.combo.window * 1000), 3);
  }

  updatePowerBars() {
    // One bar per active power-up above the player, shrinking as its time runs out.
    const p = COIN_DASH.powerUps, now = this.time.now;
    const active = [
      [this.shieldUntil, p.shield],
      [this.speedUntil, p.speed],
      [this.freezeSaved && this.freezeUntil, p.freeze]
    ].filter(([until]) => until > now);
    const w = 30, h = 4, x = this.player.x - w / 2;
    this.powerBars.clear();
    active.forEach(([until, s], i) => {
      const y = this.player.y - 22 - i * (h + 2);
      this.powerBars.fillStyle(COIN_DASH.colors.panel, 0.7).fillRect(x - 1, y - 1, w + 2, h + 2);
      this.powerBars.fillStyle(s.color).fillRect(x, y, w * (until - now) / (s.duration * 1000), h);
    });
  }

  addDrone(x, y, angle) {
    const drone = this.add.image(x, y, 'drone');
    this.drones.add(drone);
    drone.body.setCollideWorldBounds(true).setBounce(1, 1);
    drone.body.setVelocity(Math.cos(angle) * this.droneSpeed, Math.sin(angle) * this.droneSpeed);
    return drone;
  }

  randomSpot() {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    return { x, y };
  }

  popup(x, y, text, color, size = 18) {
    const t = this.add.text(x, y, text, { font: `bold ${size}px ${FONT}`, color }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  collectCoin() {
    if (this.finished) return;
    const c = COIN_DASH, now = this.time.now;
    // Coins grabbed in quick succession build a multiplier; a longer gap resets it.
    this.combo = now - this.lastCoinAt <= c.combo.window * 1000 ? Math.min(this.combo + 1, c.combo.max) : 1;
    this.streak = this.combo === 1 ? 1 : this.streak + 1;
    this.lastCoinAt = now;
    this.score += this.combo;
    this.juiceCoin(this.coin.x, this.coin.y, c.juice.sparks, c.colors.coin);
    this.popup(this.coin.x, this.coin.y, `+${this.combo}`, c.colors.hudAlt);
    this.coinsCollected++;
    if (this.coinsCollected % c.difficulty.coinsPerLevel === 0) this.levelUp();
    this.placeCoin();
  }

  comboActive() { return this.time.now - this.lastCoinAt <= COIN_DASH.combo.window * 1000 && this.combo > 1; }

  levelUp() {
    const c = COIN_DASH, d = c.difficulty;
    this.level++;
    this.droneSpeed *= d.speedUp;
    this.drones.getChildren().forEach(drone => drone.body.velocity.scale(d.speedUp));
    if (this.freezeSaved) this.freezeSaved.forEach(s => { s.vx *= d.speedUp; s.vy *= d.speedUp; });
    if (this.drones.getLength() < d.maxDrones) {
      // Enter from the corner farthest from the player.
      const x = this.player.x < c.width / 2 ? c.width - 40 : 40;
      const y = this.player.y < (c.height + 44) / 2 ? c.height - 40 : 84;
      const drone = this.addDrone(x, y, Phaser.Math.FloatBetween(0, Math.PI * 2));
      if (this.freezeSaved) {
        this.freezeSaved.push({ drone, vx: drone.body.velocity.x, vy: drone.body.velocity.y });
        drone.body.setVelocity(0, 0);
        drone.setTint(c.powerUps.freeze.color);
      }
    }
    this.popup(c.width / 2, c.height / 2, `LEVEL ${this.level}`, c.colors.alert, 40);
  }

  hitPlayer() {
    const now = this.time.now;
    if (this.finished || this.shieldActive() || now < this.invulnerableUntil) return;
    this.lives--;
    this.livesText.setText('♥'.repeat(this.lives));
    this.juiceHit();
    if (this.lives <= 0) {
      this.synth({ type: 'sawtooth', steps: [[0, 494], [0.1, 370], [0.2, 294]], slide: 60, length: 0.8 });
      return this.finish('A DRONE CAUGHT YOU!');
    }
    this.synth({ type: 'sawtooth', steps: [[0, 330]], slide: 110, length: 0.25 });
    this.invulnerableUntil = now + COIN_DASH.hitInvulnerable * 1000;
    this.tweens.add({ targets: this.player, alpha: 0.2, duration: 100, yoyo: true,
      repeat: Math.floor(COIN_DASH.hitInvulnerable * 5) - 1, onComplete: () => this.player.setAlpha(1) });
  }

  createGolden() {
    this.goldenUntil = 0;
    this.nextGoldenAt = this.time.now + COIN_DASH.goldenCoin.spawnEvery * 1000;
    this.golden = this.add.image(0, 0, 'coin').setScale(1.7).setVisible(false);
    this.physics.add.existing(this.golden);
    this.golden.body.setCircle(9);
    this.golden.body.enable = false;
    this.tweens.add({ targets: this.golden, alpha: 0.3, duration: 120, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.golden, () => this.collectGolden());
  }

  spawnGolden() {
    const { x, y } = this.randomSpot();
    this.golden.setPosition(x, y).setVisible(true);
    this.golden.body.enable = true;
    this.golden.body.reset(x, y);
    this.goldenUntil = this.time.now + COIN_DASH.goldenCoin.lifetime * 1000;
  }

  hideGolden() {
    this.golden.setVisible(false);
    this.golden.body.enable = false;
    this.nextGoldenAt = this.time.now + COIN_DASH.goldenCoin.spawnEvery * 1000;
  }

  collectGolden() {
    if (this.finished || !this.golden.visible) return;
    const value = COIN_DASH.goldenCoin.value;
    this.score += value;
    this.juiceCoin(this.golden.x, this.golden.y, COIN_DASH.juice.goldenSparks, COIN_DASH.colors.coinLight, 12);
    this.popup(this.golden.x, this.golden.y, `+${value}`, COIN_DASH.colors.hudAlt, 24);
    this.hideGolden();
  }

  updateGolden() {
    const now = this.time.now;
    if (this.golden.visible && now >= this.goldenUntil) this.hideGolden();
    else if (!this.golden.visible && now >= this.nextGoldenAt) this.spawnGolden();
  }

  createSpeed() {
    const s = COIN_DASH.powerUps.speed;
    this.speedUntil = 0;
    this.speedPickupUntil = 0;
    this.speedNextSpawn = this.time.now + s.spawnEvery * 1000;
    this.speedText = this.add.text(300, 14, '', { font: `bold 16px ${FONT}`, color: '#80ed6a' });
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
    this.synth({ steps: [[0, 523], [0.05, 659], [0.1, 784], [0.15, 1047]], length: 0.25 });
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

  createJuice() {
    this.streak = 0;
    if (!this.textures.exists('spark')) this.make.graphics({ add: false }).fillStyle(0xffffff).fillRect(0, 0, 4, 4)
      .generateTexture('spark', 4, 4).destroy();
    const j = COIN_DASH.juice;
    this.sparks = this.add.particles(0, 0, 'spark', { emitting: false, lifespan: 420, gravityY: 300,
      speed: { min: j.sparkSpeed * 0.4, max: j.sparkSpeed }, scale: { start: 1.5, end: 0 } }).setDepth(6);
  }

  // Coin pickup feedback: a pixel burst, a light shake, a squash on the player and a chime that rises with the streak.
  juiceCoin(x, y, count, tint, extraSteps = 0) {
    const j = COIN_DASH.juice, steps = j.pitchSteps;
    this.sparks.setParticleTint(tint).explode(count, x, y);
    this.cameras.main.shake(j.shakeMs, j.shake * Math.min(this.streak || 1, 4));
    this.tweens.add({ targets: this.player, scale: j.punch, duration: 60, yoyo: true, onComplete: () => this.player.setScale(1) });
    this.playCoinSound(steps[Math.min(Math.max(this.streak, 1) - 1, steps.length - 1)] + extraSteps);
  }

  juiceHit() {
    const j = COIN_DASH.juice;
    this.cameras.main.shake(j.hitShakeMs, j.hitShake).flash(150, 255, 60, 110);
    this.streak = 0;
  }

  // All sounds are synthesized, so the game still ships without audio assets. One oscillator under a
  // decaying envelope: steps are [offset s, Hz], and slide glides from the last step to that Hz.
  synth({ type = 'square', steps, length, slide, volume = COIN_DASH.sfxVolume, at, out }) {
    const ctx = this.sound.context;
    if (!ctx) return;
    const t = at ?? ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    gain.connect(out ?? ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = type;
    steps.forEach(([offset, hz]) => osc.frequency.setValueAtTime(hz, t + offset));
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + length);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + length);
  }

  playCoinSound(semitones = 0) {
    const k = 2 ** (semitones / 12);
    this.synth({ steps: [[0, 988 * k], [0.07, 1319 * k]], length: 0.25, volume: COIN_DASH.coinSoundVolume });
  }

  playCountdownBeep(seconds) {
    if (seconds > 0) this.synth({ steps: [[0, 880]], length: 0.12 });
    else this.synth({ steps: [[0, 1760]], length: 0.5 });
  }

  startMusic() {
    const ctx = this.sound.context;
    this.music = null;
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.gain.value = COIN_DASH.musicVolume;
    gain.connect(ctx.destination);
    this.music = { gain, step: 0, next: ctx.currentTime + 0.05 };
  }

  updateMusic() {
    if (!this.music) return;
    // Schedule slightly ahead on the audio clock so the loop keeps time even when frames stutter;
    // nothing is scheduled while paused, so the music stops and resumes with the game.
    const ctx = this.sound.context, m = this.music, eighth = 30 / COIN_DASH.musicBpm;
    if (m.next < ctx.currentTime) m.next = ctx.currentTime + 0.05; // resync after a pause or audio unlock
    while (m.next < ctx.currentTime + 0.15) {
      const i = m.step++ % MUSIC.bass.length;
      this.synth({ type: 'triangle', steps: [[0, midiHz(MUSIC.bass[i])]], length: eighth * 0.9,
        volume: 1, at: m.next, out: m.gain });
      if (MUSIC.lead[i]) {
        this.synth({ steps: [[0, midiHz(MUSIC.lead[i])]], length: eighth * 0.8, volume: 0.35, at: m.next, out: m.gain });
      }
      m.next += eighth;
    }
  }

  stopMusic() {
    if (!this.music) return;
    this.music.gain.gain.setTargetAtTime(0, this.sound.context.currentTime, 0.05);
    this.music = null;
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.pause();
      this.tweens.pauseAll();
      this.sparks.pause();
    } else {
      // time.now keeps running while paused, so push every timestamp-based timer back by the pause.
      const d = this.time.now - this.pausedAt;
      for (const k of PAUSABLE_TIMERS) if (Number.isFinite(this[k]) && this[k] > 0) this[k] += d;
      this.physics.resume();
      this.tweens.resumeAll();
      this.sparks.resume();
    }
    this.pauseText.setVisible(this.paused);
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
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(this.playerSpeed());
    this.player.body.setVelocity(direction.x, direction.y);
    this.updateSpeed();
    this.updateFreeze();
    this.updateGolden();
    this.updateMusic();
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    if (seconds !== this.lastSecond) {
      this.lastSecond = seconds;
      if (seconds <= COIN_DASH.countdownSeconds) this.playCountdownBeep(seconds);
    }
    this.hud.setText(`SCORE ${String(this.score).padStart(4, '0')}${this.comboActive() ? ` x${this.combo}` : ''}`);
    this.timer.setText(`TIME ${String(seconds).padStart(2, '0')}`);
    if (seconds === 0) this.finish('TIME IS UP!');
    this.updateShield();
    this.updateComboBar();
    this.updatePowerBars();
  }

  createShield() {
    const s = COIN_DASH.powerUps.shield;
    this.shieldUntil = 0;
    this.nextShieldAt = this.time.now + s.spawnEvery * 1000;
    this.shieldPickup = this.add.rectangle(0, 0, 18, 18, s.color).setAngle(45).setVisible(false);
    this.physics.add.existing(this.shieldPickup);
    this.shieldPickup.body.enable = false;
    this.shieldRing = this.add.circle(0, 0, 22).setStrokeStyle(3, s.color).setVisible(false);
    this.shieldText = this.add.text(190, 14, '', { font: `bold 16px ${FONT}`, color: '#4cc9f0' });
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
    this.synth({ type: 'triangle', steps: [[0, 300]], slide: 900, length: 0.3 });
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
    this.freezeText = this.add.text(405, 14, '', { font: `bold 16px ${FONT}`, color: '#bde0fe' });
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
    this.synth({ type: 'sine', steps: [[0, 2093], [0.06, 1568], [0.12, 1319], [0.18, 1047]], length: 0.4 });
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

  loadHighScores() {
    // Storage can be unavailable (private windows, blocked site data); the table then lasts one round.
    try { return JSON.parse(localStorage.getItem(COIN_DASH.highScoreKey)) || []; } catch (e) { return []; }
  }

  loadHighScore() { return this.loadHighScores()[0]?.score ?? 0; }

  saveHighScore() {
    const c = COIN_DASH, entry = { score: this.score, name: this.character.name };
    let scores = this.loadHighScores();
    const isNew = this.score > 0 && this.score > (scores[0]?.score ?? 0);
    scores = [...scores, entry].sort((a, b) => b.score - a.score).slice(0, c.highScoreCount);
    try { localStorage.setItem(c.highScoreKey, JSON.stringify(scores)); } catch (e) { /* not saved */ }
    if (isNew) this.best.setText(`HI ${String(this.score).padStart(4, '0')}`);
    return { scores, entry, isNew };
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    this.stopMusic();
    // Power-up pickups and timers would otherwise stay frozen on top of the end screen.
    [this.shieldPickup, this.speedPickup, this.freezePickup, this.shieldRing, this.golden].forEach(o => o.setVisible(false));
    [this.shieldText, this.speedText, this.freezeText].forEach(t => t.setText(''));
    [this.powerBars, this.comboBar].forEach(g => g.clear());
    const { scores, entry, isNew } = this.saveHighScore();
    const c = COIN_DASH, cx = c.width / 2, cy = (c.height + 44) / 2;
    const style = (size, color) => ({ font: `bold ${size}px ${FONT}`, color });
    this.add.rectangle(cx, cy - 10, 480, 400, c.colors.panel, 0.92).setStrokeStyle(4, c.colors.hudLine);
    this.add.text(cx, cy - 180, 'GAME OVER', style(40, c.colors.alert)).setOrigin(0.5);
    this.add.text(cx, cy - 136, reason, style(20, c.colors.text)).setOrigin(0.5);
    this.add.text(cx, cy - 110, `SCORE ${String(this.score).padStart(4, '0')}`, style(20, c.colors.text)).setOrigin(0.5);
    if (isNew) {
      const banner = this.add.text(cx, cy - 80, 'NEW HIGH SCORE!', style(20, c.colors.hudAlt)).setOrigin(0.5);
      this.tweens.add({ targets: banner, scale: 1.15, duration: 300, yoyo: true, repeat: -1 });
    }
    this.add.text(cx, cy - 46, 'HIGH SCORES', style(16, c.colors.hud)).setOrigin(0.5);
    scores.forEach((s, i) => this.add.text(cx, cy - 20 + i * 24,
      `${i + 1}. ${String(s.score).padStart(4, '0')}  ${s.name.padEnd(8)}`,
      style(18, s === entry ? c.colors.hudAlt : c.colors.text)).setOrigin(0.5));
    const retry = this.add.text(cx, cy + 128, 'PRESS R TO PLAY AGAIN', style(20, c.colors.hudAlt)).setOrigin(0.5);
    this.tweens.add({ targets: retry, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
    this.add.text(cx, cy + 162, 'PRESS C TO CHANGE CHARACTER', style(16, c.colors.text)).setOrigin(0.5);
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
  scene: [CharacterSelect, CoinDash]
});
