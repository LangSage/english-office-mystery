import { GameState } from "./game-state.js";
import { UIController } from "./ui.js";

const ASSET_PATHS = {
  desk: "./assets/images/environment/desk.svg",
  "meeting-table": "./assets/images/environment/meeting-table.svg",
  "coffee-machine": "./assets/images/environment/coffee-machine.svg",
  drawer: "./assets/images/environment/drawer.svg",
  printer: "./assets/images/environment/printer.svg",
  plant: "./assets/images/environment/plant.svg",
  folder: "./assets/images/environment/folder.svg",
  counter: "./assets/images/environment/counter.svg",
  cabinet: "./assets/images/environment/cabinet.svg",
  whiteboard: "./assets/images/environment/whiteboard.svg",
  "reception-desk": "./assets/images/environment/reception-desk.svg",
  "meeting-office": "./assets/images/environment/meeting_office.png",
  "woman-office": "./assets/images/environment/woman_office.png"
};

class AudioController {
  constructor() {
    this.enabled = true;
    this.queueId = 0;
    this.lastLines = [];
    this.currentAudio = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }

  stop() {
    this.queueId += 1;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.currentAudio = null;
  }

  replay() {
    if (this.lastLines.length > 0) {
      this.playLines(this.lastLines);
    }
  }

  playLines(lines) {
    this.lastLines = lines.map((line) => ({ ...line }));
    if (!this.enabled || lines.length === 0) {
      return;
    }

    this.stop();
    const queueId = this.queueId;
    this.runQueue(queueId, this.lastLines);
  }

  async runQueue(queueId, lines) {
    for (const line of lines) {
      if (!this.enabled || queueId !== this.queueId) {
        return;
      }

      await this.playSingle(line.id);
    }
  }

  playSingle(lineId) {
    return new Promise((resolve) => {
      const candidates = [
        `./assets/audio/dialogue/${lineId}.mp3`,
        `./assets/audio/dialogue/${lineId}.wav`
      ];

      const trySource = (index) => {
        if (index >= candidates.length) {
          this.currentAudio = null;
          resolve();
          return;
        }

        const audio = new Audio(candidates[index]);
        this.currentAudio = audio;

        const cleanup = () => {
          audio.removeEventListener("ended", onEnded);
          audio.removeEventListener("error", onError);
        };

        const onEnded = () => {
          cleanup();
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          resolve();
        };

        const onError = () => {
          cleanup();
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          trySource(index + 1);
        };

        audio.addEventListener("ended", onEnded, { once: true });
        audio.addEventListener("error", onError, { once: true });
        audio.play().catch(onError);
      };

      trySource(0);
    });
  }
}

function renderTextureCircle(scene, key, fillColor) {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  graphics.fillStyle(0xffffff, 0);
  graphics.fillRect(0, 0, 72, 72);
  graphics.lineStyle(6, 0xffffff, 0.88);
  graphics.fillStyle(fillColor, 1);
  graphics.fillCircle(36, 36, 24);
  graphics.strokeCircle(36, 36, 24);
  graphics.fillStyle(0xffffff, 0.92);
  graphics.fillCircle(36, 30, 8);
  graphics.generateTexture(key, 72, 72);
  graphics.destroy();
}

function createCollider(scene, group, decor) {
  if (!decor.collider) {
    return;
  }

  const zone = scene.add.zone(decor.x, decor.y, decor.collider.width, decor.collider.height);
  scene.physics.add.existing(zone, true);
  group.add(zone);
}

function createPrompt(scene) {
  const background = scene.add.rectangle(0, 0, 124, 34, 0x102032, 0.88).setStrokeStyle(2, 0xffffff, 0.18);
  const label = scene.add.text(0, 0, "", {
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "700",
    color: "#ffffff"
  }).setOrigin(0.5);

  const prompt = scene.add.container(0, 0, [background, label]);
  prompt.setDepth(2000);
  prompt.setVisible(false);

  return { prompt, background, label };
}

function createTargetMarkers(scene, story) {
  const markers = new Map();

  for (const interactive of story.interactives) {
    const ring = scene.add.circle(interactive.x, interactive.y, interactive.radius ?? 70, 0xf7c561, 0.12);
    ring.setStrokeStyle(3, 0xf7c561, 0.65);
    ring.setDepth(50);
    ring.setVisible(false);
    scene.tweens.add({
      targets: ring,
      alpha: { from: 0.28, to: 0.85 },
      scale: { from: 0.95, to: 1.08 },
      duration: 1000,
      repeat: -1,
      yoyo: true
    });
    markers.set(interactive.id, ring);
  }

  return markers;
}

function drawWorld(scene, story) {
  const background = scene.add.graphics();
  background.fillStyle(0xe7e1d7, 1);
  background.fillRoundedRect(0, 0, story.world.width, story.world.height, 28);

  for (const zone of story.world.zones) {
    background.fillStyle(Phaser.Display.Color.HexStringToColor(zone.color).color, 1);
    background.fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 24);
    background.lineStyle(2, 0xffffff, 0.7);
    background.strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 24);
  }

  background.lineStyle(8, 0xffffff, 0.45);
  background.strokeRoundedRect(14, 14, story.world.width - 28, story.world.height - 28, 26);

  for (let x = 60; x < story.world.width - 60; x += 110) {
    for (let y = 56; y < story.world.height - 56; y += 110) {
      background.fillStyle(0xffffff, 0.08);
      background.fillCircle(x, y, 2);
    }
  }
}

function syncTargetMarkers(state, markers) {
  const active = new Set(state.getTargetIds());
  for (const [id, marker] of markers.entries()) {
    marker.setVisible(active.has(id));
  }
}

function getNearestInteractive(player, sprites) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const entry of sprites) {
    const distance = Phaser.Math.Distance.Between(player.x, player.y, entry.object.x, entry.object.y);
    if (distance < nearestDistance && distance <= entry.radius) {
      nearest = entry;
      nearestDistance = distance;
    }
  }

  return nearest;
}

async function bootstrap() {
  const story = await fetch("./assets/data/story.json").then((response) => response.json());
  const query = new URLSearchParams(window.location.search);
  const state = new GameState(story);
  const ui = new UIController(story);
  const audio = new AudioController();
  const touchState = {
    up: false,
    down: false,
    left: false,
    right: false,
    interact: false,
    hint: false
  };

  let sceneRef = null;

  const render = (lines = state.latestDialogue) => {
    ui.render(state);
    if (lines?.length) {
      ui.setDialogue(lines, story.speakers);
    }
    ui.renderAudioState(audio.enabled);
    if (sceneRef) {
      syncTargetMarkers(state, sceneRef.targetMarkers);
    }
  };

  const showCurrentTask = () => {
    if (!state.started || state.completed) {
      return;
    }

    const step = state.getCurrentStep();
    ui.showMessage({
      kicker: `Step ${state.getCurrentStepIndex() + 1}`,
      title: step.title,
      text: step.instruction
    });
  };

  const runLines = (lines) => {
    if (!lines || lines.length === 0) {
      return;
    }
    ui.setDialogue(lines, story.speakers);
    audio.playLines(lines);
  };

  const startCase = () => {
    const lines = state.startCase();
    ui.hideStart();
    ui.hideEnd();
    if (sceneRef) {
      sceneRef.resetPlayerPosition();
      syncTargetMarkers(state, sceneRef.targetMarkers);
    }
    render(lines);
    runLines(lines);
    showCurrentTask();
  };

  const resetCase = () => {
    state.reset();
    audio.stop();
    ui.showStart();
    ui.hideEnd();
    if (sceneRef) {
      sceneRef.resetPlayerPosition();
      syncTargetMarkers(state, sceneRef.targetMarkers);
    }
    render([]);
  };

  const requestHint = () => {
    const { lines } = state.requestHint();
    render(lines);
    runLines(lines);

    const hintLine = lines?.[lines.length - 1];
    if (hintLine) {
      ui.showMessage({
        kicker: "Hint",
        title: "Try this",
        text: hintLine.text
      });
    }
  };

  const handleInteraction = (interactiveId) => {
    const result = state.interact(interactiveId);
    if (!result) {
      return;
    }
    render(result.lines);
    runLines(result.lines);
    if (result.stepChanged && !result.completed) {
      showCurrentTask();
    }
  };

  ui.bindHandlers({
    onStart: startCase,
    onReset: resetCase,
    onInfo: showCurrentTask,
    onHint: requestHint,
    onAudioToggle: () => {
      const enabled = audio.toggle();
      ui.renderAudioState(enabled);
    },
    onReplay: () => audio.replay()
  });

  document.querySelectorAll("[data-touch]").forEach((button) => {
    const direction = button.getAttribute("data-touch");
    const activate = (value) => {
      touchState[direction] = value;
    };
    button.addEventListener("pointerdown", () => activate(true));
    button.addEventListener("pointerup", () => activate(false));
    button.addEventListener("pointerleave", () => activate(false));
    button.addEventListener("pointercancel", () => activate(false));
  });

  document.querySelectorAll("[data-touch-action]").forEach((button) => {
    const action = button.getAttribute("data-touch-action");
    button.addEventListener("pointerdown", () => {
      touchState[action] = true;
    });
  });

  class OfficeScene extends Phaser.Scene {
    constructor() {
      super("OfficeScene");
      this.interactiveSprites = [];
      this.targetMarkers = new Map();
    }

    preload() {
      Object.entries(ASSET_PATHS).forEach(([key, path]) => {
        this.load.image(key, path);
      });
    }

    create() {
      sceneRef = this;
      drawWorld(this, story);

      this.physics.world.setBounds(0, 0, story.world.width, story.world.height);
      this.cameras.main.setBounds(0, 0, story.world.width, story.world.height);
      this.cameras.main.setBackgroundColor("#d5d9dd");

      const obstacleGroup = this.physics.add.staticGroup();

      for (const decor of story.world.decor) {
        const image = this.add.image(decor.x, decor.y, decor.asset);
        image.setScale(decor.scale ?? 1);
        image.setDepth(decor.y);
        createCollider(this, obstacleGroup, decor);
      }

      renderTextureCircle(this, "player-token", Phaser.Display.Color.HexStringToColor(story.speakers.mia.tokenColor).color);
      this.player = this.physics.add.image(130, 820, "player-token");
      this.player.setCircle(24);
      this.player.setCollideWorldBounds(true);
      this.player.setDepth(this.player.y);

      this.physics.add.collider(this.player, obstacleGroup);

      for (const interactive of story.interactives) {
        let object = null;

        if (interactive.kind === "npc") {
          const speaker = story.speakers[interactive.speakerId];
          const tokenKey = `${interactive.id}-token`;
          renderTextureCircle(this, tokenKey, Phaser.Display.Color.HexStringToColor(speaker.tokenColor).color);
          object = this.add.image(interactive.x, interactive.y, tokenKey).setDepth(interactive.y + 5);
          const label = this.add.text(interactive.x, interactive.y - 42, speaker.name, {
            fontFamily: "Manrope",
            fontSize: "14px",
            fontStyle: "700",
            color: "#1f2431",
            backgroundColor: "#ffffffcc",
            padding: { left: 8, right: 8, top: 3, bottom: 3 }
          }).setOrigin(0.5).setDepth(1200);
          interactive._label = label;
        } else {
          object = this.add.image(interactive.x, interactive.y, interactive.asset);
          object.setScale(interactive.scale ?? 1);
          object.setDepth(interactive.y);
        }

        interactive._object = object;
        this.interactiveSprites.push({
          id: interactive.id,
          object,
          radius: interactive.radius ?? 80,
          data: interactive
        });
      }

      this.targetMarkers = createTargetMarkers(this, story);
      syncTargetMarkers(state, this.targetMarkers);

      const { prompt, background, label } = createPrompt(this);
      this.prompt = prompt;
      this.promptBackground = background;
      this.promptLabel = label;

      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        interact: Phaser.Input.Keyboard.KeyCodes.E,
        altInteract: Phaser.Input.Keyboard.KeyCodes.SPACE,
        hint: Phaser.Input.Keyboard.KeyCodes.H
      });

      render();
    }

    resetPlayerPosition() {
      if (!this.player) {
        return;
      }
      this.player.setPosition(130, 820);
      this.player.setVelocity(0, 0);
      this.cameras.main.centerOn(130, 820);
    }

    update() {
      const speed = 180;
      let velocityX = 0;
      let velocityY = 0;

      if (this.cursors.left.isDown || this.keys.left.isDown || touchState.left) {
        velocityX -= speed;
      }
      if (this.cursors.right.isDown || this.keys.right.isDown || touchState.right) {
        velocityX += speed;
      }
      if (this.cursors.up.isDown || this.keys.up.isDown || touchState.up) {
        velocityY -= speed;
      }
      if (this.cursors.down.isDown || this.keys.down.isDown || touchState.down) {
        velocityY += speed;
      }

      this.player.setVelocity(velocityX, velocityY);
      this.player.setDepth(this.player.y);

      for (const interactive of story.interactives) {
        if (interactive._label) {
          interactive._label.setPosition(interactive.x, interactive.y - 42);
        }
      }

      const nearby = getNearestInteractive(this.player, this.interactiveSprites);

      if (nearby) {
        this.prompt.setVisible(true);
        this.promptLabel.setText(nearby.data.label);
        this.promptBackground.width = Math.max(120, this.promptLabel.width + 28);
        this.prompt.setPosition(nearby.object.x, nearby.object.y - 56);
      } else {
        this.prompt.setVisible(false);
      }

      const interactPressed =
        Phaser.Input.Keyboard.JustDown(this.keys.interact) ||
        Phaser.Input.Keyboard.JustDown(this.keys.altInteract) ||
        touchState.interact;

      const hintPressed =
        Phaser.Input.Keyboard.JustDown(this.keys.hint) ||
        touchState.hint;

      if (interactPressed && nearby) {
        handleInteraction(nearby.id);
      }

      if (hintPressed) {
        requestHint();
      }

      touchState.interact = false;
      touchState.hint = false;
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "phaser-root",
    width: 960,
    height: 640,
    backgroundColor: "#d5d9dd",
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [OfficeScene]
  });

  render([]);

  if (query.get("mute") === "1") {
    audio.enabled = false;
    ui.renderAudioState(false);
  }

  if (query.get("autostart") === "1") {
    window.setTimeout(() => {
      startCase();
    }, 200);
  }
}

bootstrap();
