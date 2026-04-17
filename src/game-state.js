export class GameState {
  constructor(story) {
    this.story = story;
    this.interactiveById = new Map(story.interactives.map((item) => [item.id, item]));
    this.stepIndexById = new Map(story.steps.map((step, index) => [step.id, index]));
    this.reset();
  }

  reset() {
    this.started = false;
    this.completed = false;
    this.currentStepId = this.story.steps[0].id;
    this.inventory = [];
    this.notes = [];
    this.hintLevel = 0;
    this.hintsUsed = 0;
    this.latestDialogue = [];
    this.dialogueHistory = [];
    this.responseTurns = {};
  }

  startCase() {
    this.reset();
    this.started = true;
    this.notes = [
      "Mia wants coffee.",
      "Listen to the clues."
    ];
    this.setDialogue(this.story.introLines);
    return this.story.introLines;
  }

  getCurrentStep() {
    return this.story.steps[this.stepIndexById.get(this.currentStepId)];
  }

  getCurrentStepIndex() {
    return this.stepIndexById.get(this.currentStepId);
  }

  setDialogue(lines) {
    this.latestDialogue = lines.map((line) => ({ ...line }));
    this.dialogueHistory.push(...this.latestDialogue);
    this.dialogueHistory = this.dialogueHistory.slice(-20);
  }

  addNote(note) {
    if (!note || this.notes.includes(note)) {
      return;
    }
    this.notes.unshift(note);
    this.notes = this.notes.slice(0, 6);
  }

  addInventoryItems(items = []) {
    for (const item of items) {
      if (!this.inventory.includes(item)) {
        this.inventory.push(item);
      }
    }
  }

  setStep(stepId) {
    if (!stepId || stepId === this.currentStepId) {
      return;
    }
    this.currentStepId = stepId;
    this.hintLevel = 0;
  }

  applyEffects(effects = {}) {
    if (effects.addInventory) {
      this.addInventoryItems(effects.addInventory);
    }

    if (effects.notes) {
      for (const note of effects.notes) {
        this.addNote(note);
      }
    }

    if (effects.step) {
      this.setStep(effects.step);
    }

    if (effects.completeCase) {
      this.completed = true;
    }
  }

  getResponseLines(response, responseKey) {
    if (Array.isArray(response.variants) && response.variants.length > 0) {
      const turn = this.responseTurns[responseKey] ?? 0;
      this.responseTurns[responseKey] = turn + 1;
      return response.variants[turn % response.variants.length];
    }

    return response.lines ?? [];
  }

  interact(interactiveId) {
    if (!this.started) {
      const lines = [
        {
          id: "not_started_1",
          speaker: "narrator",
          text: "Press Start Game."
        }
      ];
      this.setDialogue(lines);
      return { lines, interactive: null, stepChanged: false, completed: false };
    }

    const interactive = this.interactiveById.get(interactiveId);

    if (!interactive) {
      return null;
    }

    const responseKey = interactive.responses?.[this.currentStepId]
      ? `${interactiveId}:${this.currentStepId}`
      : `${interactiveId}:default`;
    const response =
      interactive.responses?.[this.currentStepId] ??
      interactive.responses?.default;

    if (!response) {
      return null;
    }

    const previousStepId = this.currentStepId;
    const lines = this.getResponseLines(response, responseKey);

    this.applyEffects(response.effects);
    this.setDialogue(lines);

    return {
      lines,
      interactive,
      stepChanged: previousStepId !== this.currentStepId,
      completed: this.completed
    };
  }

  requestHint() {
    if (!this.started) {
      const line = {
        id: "hint_wait_1",
        speaker: "narrator",
        text: "Start the game first."
      };
      this.setDialogue([line]);
      return { lines: [line], targetIds: [] };
    }

    if (this.completed) {
      const line = {
        id: "hint_complete_1",
        speaker: "narrator",
        text: "You solved the case. Press Play Again."
      };
      this.setDialogue([line]);
      return { lines: [line], targetIds: [] };
    }

    const step = this.getCurrentStep();
    const hintIndex = Math.min(this.hintLevel, step.hints.length - 1);
    const line = step.hints[hintIndex];

    if (this.hintLevel < step.hints.length) {
      this.hintsUsed += 1;
      this.hintLevel += 1;
    }

    this.setDialogue([line]);
    this.addNote(`Hint: ${line.text}`);

    return {
      lines: [line],
      targetIds: step.targetIds
    };
  }

  getProgress() {
    const currentIndex = this.getCurrentStepIndex();

    return this.story.steps.map((step, index) => {
      let status = "Up next";

      if (this.completed || index < currentIndex) {
        status = "Done";
      } else if (index === currentIndex) {
        status = this.completed ? "Done" : "Current";
      }

      return {
        ...step,
        status,
        isCurrent: !this.completed && index === currentIndex,
        isComplete: this.completed || index < currentIndex
      };
    });
  }

  getTargetIds() {
    if (!this.started || this.completed) {
      return [];
    }
    return this.getCurrentStep().targetIds ?? [];
  }

  getStars() {
    if (this.hintsUsed === 0) {
      return 3;
    }
    if (this.hintsUsed <= 2) {
      return 2;
    }
    return 1;
  }
}
