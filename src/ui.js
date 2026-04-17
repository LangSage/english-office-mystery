export class UIController {
  constructor(story) {
    this.story = story;
    this.activeDrawerId = null;
    this.elements = {
      startScreen: document.getElementById("start-screen"),
      endScreen: document.getElementById("end-screen"),
      canvasShell: document.querySelector(".canvas-shell"),
      endTitle: document.getElementById("end-title"),
      endSummary: document.getElementById("end-summary"),
      starRow: document.getElementById("star-row"),
      startVocabList: document.getElementById("start-vocab-list"),
      objectiveTitle: document.getElementById("objective-title"),
      objectiveText: document.getElementById("objective-text"),
      stepChip: document.getElementById("step-chip"),
      speakerAvatar: document.getElementById("speaker-avatar"),
      speakerName: document.getElementById("speaker-name"),
      speakerRole: document.getElementById("speaker-role"),
      dialogueText: document.getElementById("dialogue-text"),
      vocabularyList: document.getElementById("vocabulary-list"),
      inventoryList: document.getElementById("inventory-list"),
      notesList: document.getElementById("notes-list"),
      progressList: document.getElementById("progress-list"),
      startButton: document.getElementById("start-button"),
      resetButton: document.getElementById("reset-button"),
      playAgainButton: document.getElementById("play-again-button"),
      hintButton: document.getElementById("hint-button"),
      audioButton: document.getElementById("audio-button"),
      replayButton: document.getElementById("replay-button"),
      drawerSheet: document.getElementById("drawer-sheet"),
      drawerTitle: document.getElementById("drawer-title"),
      drawerClose: document.getElementById("drawer-close")
    };
    this.drawerButtons = Array.from(document.querySelectorAll("[data-drawer-button]"));
    this.drawerPanels = Array.from(document.querySelectorAll("[data-drawer-panel]"));
  }

  bindHandlers(handlers) {
    this.elements.startButton.addEventListener("click", handlers.onStart);
    this.elements.resetButton.addEventListener("click", handlers.onReset);
    this.elements.playAgainButton.addEventListener("click", handlers.onStart);
    this.elements.hintButton.addEventListener("click", handlers.onHint);
    this.elements.audioButton.addEventListener("click", handlers.onAudioToggle);
    this.elements.replayButton.addEventListener("click", handlers.onReplay);
    this.elements.drawerClose.addEventListener("click", () => this.closeDrawer());

    for (const button of this.drawerButtons) {
      button.addEventListener("click", () => {
        this.toggleDrawer(button.dataset.drawerButton);
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeDrawer();
      }
    });
  }

  getStartVocabulary() {
    return this.story.meta.preGameVocab ?? [];
  }

  renderStartVocabulary() {
    if (!this.elements.startVocabList) {
      return;
    }

    this.elements.startVocabList.innerHTML = "";

    for (const item of this.getStartVocabulary()) {
      const entry = document.createElement("li");
      entry.innerHTML = `
        <span class="start-vocab-term">${item.term}</span>
        <span class="start-vocab-definition">${item.definition}</span>
      `;
      this.elements.startVocabList.appendChild(entry);
    }
  }

  setDialogue(lines, speakers) {
    const line = lines?.[lines.length - 1];

    if (!line) {
      return;
    }

    const speaker = speakers[line.speaker] ?? speakers.narrator;
    this.elements.speakerAvatar.src = speaker.avatar;
    this.elements.speakerName.textContent = speaker.name;
    this.elements.speakerRole.textContent = speaker.role;
    this.elements.dialogueText.textContent = line.text;
  }

  renderAudioState(enabled) {
    this.elements.audioButton.textContent = enabled ? "Audio On" : "Audio Off";
  }

  render(state) {
    this.renderStartVocabulary();

    if (!state.started) {
      this.elements.objectiveTitle.textContent = "Read 6 words first";
      this.elements.objectiveText.textContent = "Read the words on the start card. Then press Start Game.";
      this.elements.stepChip.textContent = "Step 0";
      this.renderVocabularyList(this.getStartVocabulary());
      this.renderInventory(state);
      this.renderList(this.elements.notesList, [
        "Read the 6 words first.",
        "Then press Start Game."
      ]);
      this.renderProgress(state);
      return;
    }

    const step = state.getCurrentStep();
    this.elements.objectiveTitle.textContent = step.title;
    this.elements.objectiveText.textContent = step.instruction;
    this.elements.stepChip.textContent = `Step ${state.getCurrentStepIndex() + 1}`;

    this.renderVocabularyList(step.vocabulary);
    this.renderInventory(state);
    this.renderList(
      this.elements.notesList,
      state.notes.length > 0 ? state.notes : ["No notes yet."]
    );
    this.renderProgress(state);

    if (state.completed) {
      this.showEnd(state);
    } else {
      this.hideEnd();
    }
  }

  renderVocabularyList(items) {
    this.elements.vocabularyList.innerHTML = "";

    for (const item of items) {
      const entry = document.createElement("li");
      entry.textContent = `${item.term}: ${item.definition}`;
      this.elements.vocabularyList.appendChild(entry);
    }
  }

  renderInventory(state) {
    this.elements.inventoryList.innerHTML = "";

    if (state.inventory.length === 0) {
      const item = document.createElement("li");
      item.textContent = "Nothing yet";
      this.elements.inventoryList.appendChild(item);
      return;
    }

    for (const itemId of state.inventory) {
      const definition = state.story.inventoryItems[itemId];
      const item = document.createElement("li");
      item.innerHTML = `
        <img class="inventory-icon" src="${definition.icon}" alt="">
        <span>${definition.label}</span>
      `;
      this.elements.inventoryList.appendChild(item);
    }
  }

  renderProgress(state) {
    this.elements.progressList.innerHTML = "";

    for (const step of state.getProgress()) {
      const item = document.createElement("li");
      if (step.isCurrent) {
        item.classList.add("is-current");
      }
      if (step.isComplete) {
        item.classList.add("is-complete");
      }
      item.innerHTML = `
        <span class="progress-title">${step.title}</span>
        <span class="progress-status">${step.status}</span>
      `;
      this.elements.progressList.appendChild(item);
    }
  }

  renderList(target, items) {
    target.innerHTML = "";

    for (const text of items) {
      const item = document.createElement("li");
      item.textContent = text;
      target.appendChild(item);
    }
  }

  toggleDrawer(panelId) {
    if (this.activeDrawerId === panelId) {
      this.closeDrawer();
      return;
    }

    this.openDrawer(panelId);
  }

  openDrawer(panelId) {
    this.activeDrawerId = panelId;
    this.elements.drawerSheet.classList.remove("drawer-sheet-hidden");

    for (const panel of this.drawerPanels) {
      panel.classList.toggle("is-active", panel.dataset.drawerPanel === panelId);
    }

    for (const button of this.drawerButtons) {
      const isActive = button.dataset.drawerButton === panelId;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        this.elements.drawerTitle.textContent = button.dataset.drawerTitle ?? "Panel";
      }
    }
  }

  closeDrawer() {
    this.activeDrawerId = null;
    this.elements.drawerSheet.classList.add("drawer-sheet-hidden");

    for (const panel of this.drawerPanels) {
      panel.classList.remove("is-active");
    }

    for (const button of this.drawerButtons) {
      button.classList.remove("is-active");
    }
  }

  hideStart() {
    this.elements.startScreen.classList.add("overlay-card-hidden");
    this.updateCanvasState();
  }

  showStart() {
    this.closeDrawer();
    this.elements.startScreen.classList.remove("overlay-card-hidden");
    this.updateCanvasState();
  }

  showEnd(state) {
    this.elements.endScreen.classList.remove("overlay-card-hidden");
    this.updateCanvasState();
    this.elements.endTitle.textContent = "The coffee is ready.";
    this.elements.endSummary.textContent =
      `You used ${state.hintsUsed} hint${state.hintsUsed === 1 ? "" : "s"}. Nice work.`;
    this.elements.starRow.innerHTML = "";

    for (let index = 0; index < 3; index += 1) {
      const star = document.createElement("span");
      star.className = "star";
      star.textContent = index < state.getStars() ? "★" : "☆";
      this.elements.starRow.appendChild(star);
    }
  }

  hideEnd() {
    this.elements.endScreen.classList.add("overlay-card-hidden");
    this.updateCanvasState();
  }

  updateCanvasState() {
    const blocked =
      !this.elements.startScreen.classList.contains("overlay-card-hidden") ||
      !this.elements.endScreen.classList.contains("overlay-card-hidden");
    this.elements.canvasShell.classList.toggle("is-blocked", blocked);
  }
}
