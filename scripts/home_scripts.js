// PROFILE DROPDOWN
const profileContainer = document.querySelector(".profile-container");
const profileButton = document.querySelector(".profile-button");
const profileMenu = document.querySelector(".profile-menu");
const logoutButton = document.getElementById("logoutButton");

// PLUS / TEMPLATES
const plusContainer = document.getElementById("plusContainer");
const plusButton = document.getElementById("plusButton");
const templateButtons = document.querySelectorAll(".template-btn");

// RECENTS
const RECENTS_STORAGE_KEY = "vision-recents";
const LOAD_REQUEST_KEY = "slide-editor-load-request";
const CURRENT_PRESENTATION_ID_KEY = "slide-editor-current-id";
const NEW_PRESENTATION_NAME_KEY = "vision-new-presentation-name";
const AUTOSAVE_KEY = "slide-editor-autosave-v1";
const SYNC_KEY = `${AUTOSAVE_KEY}-sync`;
const recentGridEl = document.getElementById("recentGrid");
const recentEmptyEl = document.querySelector(".recent-empty");
const deletePresentationOverlay = document.getElementById("deletePresentationModal");
const deletePresentationConfirmBtn = document.getElementById("deletePresentationConfirm");
const deletePresentationCancelBtn = document.getElementById("deletePresentationCancel");
const namePresentationOverlay = document.getElementById("namePresentationModal");
const namePresentationInput = document.getElementById("namePresentationInput");
const namePresentationConfirmBtn = document.getElementById("namePresentationConfirm");
const namePresentationCancelBtn = document.getElementById("namePresentationCancel");

// SETTINGS POPUP
const settingsTrigger = document.getElementById("settingsTrigger");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsModal = document.querySelector(".settings-modal");

// --- PROFILE DROPDOWN LOGIC ---

if (profileButton) {
  profileButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = profileContainer.classList.toggle("open");
    profileButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
}

if (profileMenu) {
  profileMenu.addEventListener("click", (e) => {
    // Don't close dropdown when clicking inside it
    e.stopPropagation();
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", (e) => {
    e.preventDefault();
    if (profileContainer) {
      profileContainer.classList.remove("open");
    }
    window.location.href = "login.html";
  });
}

// Close profile dropdown when clicking anywhere else
document.addEventListener("click", () => {
  if (profileContainer) {
    profileContainer.classList.remove("open");
    if (profileButton) {
      profileButton.setAttribute("aria-expanded", "false");
    }
  }
});

// --- PLUS BUTTON & TEMPLATE WHEEL ---

// Hover to open templates, click to go to editor
if (plusButton && plusContainer) {
  // Hover (mouseenter) → show templates
  plusContainer.addEventListener("mouseenter", () => {
    plusContainer.classList.add("open");
    plusButton.setAttribute("aria-expanded", "true");
  });

  // Move mouse away → close templates
  plusContainer.addEventListener("mouseleave", () => {
    plusContainer.classList.remove("open");
    plusButton.setAttribute("aria-expanded", "false");
  });

  // Click → go to slide editor
  plusButton.addEventListener("click", (e) => {
    e.stopPropagation();
    openPresentationNameModal();
  });
}

// Clicking on a template -> open editor
templateButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "editor.html";
  });
});

// Keep the wheel open while hovering, close when you leave the area
document.addEventListener("click", (e) => {
  if (!plusContainer.contains(e.target)) {
    plusContainer.classList.remove("open");
    plusButton.setAttribute("aria-expanded", "false");
  }
});

plusContainer.addEventListener("mouseenter", () => {
  plusContainer.classList.add("hovering");
});

plusContainer.addEventListener("mouseleave", () => {
  plusContainer.classList.remove("hovering");
  plusContainer.classList.remove("open");
  plusButton.setAttribute("aria-expanded", "false");
});

// Prevent closing wheel when clicking inside plusContainer area
if (plusContainer) {
  plusContainer.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// --- SETTINGS POPUP LOGIC ---

if (settingsTrigger && settingsOverlay) {
  settingsTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsOverlay.classList.add("open");

    // Close profile dropdown when opening settings
    if (profileContainer) {
      profileContainer.classList.remove("open");
    }
  });
}

if (closeSettingsBtn && settingsOverlay) {
  closeSettingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsOverlay.classList.remove("open");
  });
}

// Clicking on the dark overlay closes the modal
if (settingsOverlay) {
  settingsOverlay.addEventListener("click", () => {
    settingsOverlay.classList.remove("open");
  });
}

// But clicking inside the modal should NOT close it
if (settingsModal) {
  settingsModal.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// --- RECENT PRESENTATIONS ---

function formatRecentTimestamp(isoString) {
  if (!isoString) return "Unknown time";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const datePart = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timePart = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${datePart} • ${timePart}`;
}

function openPresentation(presentationId, versionId) {
  if (!presentationId) return;
  try {
    const payload = JSON.stringify({ presentationId, versionId });
    localStorage.setItem(LOAD_REQUEST_KEY, payload);
    localStorage.setItem(CURRENT_PRESENTATION_ID_KEY, presentationId);
  } catch (error) {
    console.warn("Failed to persist load request", error);
  }
  window.location.href = "slide-editor.html";
}

let openVersionsPanel = null;
let pendingPresentationDeletionId = null;

function isMenuRelatedTarget(target) {
  if (!(target instanceof Element)) return false;
  return (
    target.closest(".recent-thumb-menu") ||
    target.closest(".recent-thumb-menu-btn") ||
    target.closest(".recent-version-button")
  );
}

function closeVersionsPanel() {
  if (!openVersionsPanel) return;
  openVersionsPanel.classList.remove("open");
  openVersionsPanel = null;
}

function applyPreviewStyles(element, presentation) {
  const preview = presentation?.preview || {};
  const backgroundColor = preview.backgroundColor || "#f8fafc";
  element.style.backgroundColor = backgroundColor;

  if (preview.backgroundImage) {
    element.style.backgroundImage = `url(${preview.backgroundImage})`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
  } else {
    element.style.backgroundImage = "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(16,185,129,0.22))";
  }
}

function renderRecents(recents) {
  if (!recentGridEl) return;
  closeVersionsPanel();
  recentGridEl.innerHTML = "";

  if (!Array.isArray(recents) || !recents.length) {
    if (recentEmptyEl) {
      recentEmptyEl.style.display = "block";
    }
    recentGridEl.style.display = "none";
    return;
  }

  if (recentEmptyEl) {
    recentEmptyEl.style.display = "none";
  }
  recentGridEl.style.display = "flex";
  recentGridEl.classList.toggle("single", recents.length === 1);
  recentGridEl.classList.toggle("multiple", recents.length > 1);

  if (recents.length === 1) {
    recentGridEl.style.justifyContent = "center";
  } else {
    recentGridEl.style.justifyContent = "flex-start";
  }

  const orderedRecents = [...recents].sort((a, b) => {
    const timeA = new Date(a.lastSavedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastSavedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  orderedRecents.forEach((presentation, index) => {
    const versionCount = Array.isArray(presentation.versions) ? presentation.versions.length : 0;
    const latestVersionId =
      presentation.latestVersionId ||
      (Array.isArray(presentation.versions) && presentation.versions.length ? presentation.versions[0].id : undefined);

    const tile = document.createElement("article");
    tile.className = "recent-tile";
    tile.style.animationDelay = `${Math.min(index * 50, 300)}ms`;
    tile.tabIndex = 0;

    const thumb = document.createElement("div");
    thumb.className = "recent-thumb";
    applyPreviewStyles(thumb, presentation);

    const thumbLabel = document.createElement("span");
    thumbLabel.className = "recent-thumb-label";
    thumbLabel.textContent = presentation.preview?.title || presentation.name || "Untitled slide";
    thumb.appendChild(thumbLabel);

    const thumbControls = document.createElement("div");
    thumbControls.className = "recent-thumb-controls";

    const menuButton = document.createElement("button");
    menuButton.className = "recent-thumb-menu-btn";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "More options");
    menuButton.innerHTML = "&#8942;";

    const menu = document.createElement("div");
    menu.className = "recent-thumb-menu";

    const duplicateAction = document.createElement("button");
    duplicateAction.type = "button";
    duplicateAction.textContent = "Duplicate presentation";
    duplicateAction.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.remove("open");
      duplicatePresentation(presentation);
    });

    const deleteAction = document.createElement("button");
    deleteAction.type = "button";
    deleteAction.textContent = "Delete presentation";
    deleteAction.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.remove("open");
      deletePresentation(presentation.id);
    });

    const shareAction = document.createElement("button");
    shareAction.type = "button";
    shareAction.textContent = "Share presentation";
    shareAction.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.remove("open");
      sharePresentation(presentation);
    });

    menu.appendChild(duplicateAction);
    menu.appendChild(deleteAction);
    menu.appendChild(shareAction);

    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = menu.classList.contains("open");
      closeThumbMenus(menu);
      if (!isOpen) {
        menu.classList.add("open");
      }
    });

    thumbControls.appendChild(menuButton);
    thumbControls.appendChild(menu);

    const thumbContainer = document.createElement("div");
    thumbContainer.className = "recent-thumb-container";
    thumbContainer.appendChild(thumb);
    thumbContainer.appendChild(thumbControls);

    const info = document.createElement("div");
    info.className = "recent-info";

    const infoHeader = document.createElement("div");
    infoHeader.className = "recent-info-header";

    const title = document.createElement("h3");
    title.className = "recent-info-title";
    title.textContent = presentation.name || "Untitled presentation";

    const versionButton = document.createElement("button");
    versionButton.className = "recent-version-button";
    versionButton.type = "button";
    versionButton.textContent = versionCount === 1 ? "1 version" : `${versionCount || 0} versions`;
    versionButton.title = "View saved versions";

    infoHeader.appendChild(title);
    infoHeader.appendChild(versionButton);

    const meta = document.createElement("div");
    meta.className = "recent-info-meta";
    meta.textContent = presentation.lastSavedAt
      ? `Last saved ${formatRecentTimestamp(presentation.lastSavedAt)}`
      : "Not saved yet";

    info.appendChild(infoHeader);
    info.appendChild(meta);

    const versionsPanel = document.createElement("div");
    versionsPanel.className = "recent-versions-panel";

    if (!versionCount) {
      const empty = document.createElement("div");
      empty.className = "recent-versions-empty";
      empty.textContent = "No saved versions yet.";
      versionsPanel.appendChild(empty);
    } else {
      presentation.versions.forEach((version) => {
        const item = document.createElement("button");
        item.className = "recent-versions-item";
        item.type = "button";
        item.textContent = `Saved ${formatRecentTimestamp(version.savedAt)}`;
        item.addEventListener("click", (event) => {
          event.stopPropagation();
          closeVersionsPanel();
          openPresentation(presentation.id, version.id);
        });
        versionsPanel.appendChild(item);
      });
    }

    const infoCard = document.createElement("div");
    infoCard.className = "recent-info-card";
    infoCard.appendChild(info);

    tile.appendChild(thumbContainer);
    tile.appendChild(infoCard);
    tile.appendChild(versionsPanel);

    tile.addEventListener("click", (event) => {
      if (isMenuRelatedTarget(event.target)) {
        return;
      }
      closeVersionsPanel();
      closeThumbMenus();
      openPresentation(presentation.id, latestVersionId);
    });

    tile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        if (isMenuRelatedTarget(event.target)) {
          return;
        }
        event.preventDefault();
        closeVersionsPanel();
        closeThumbMenus();
        openPresentation(presentation.id, latestVersionId);
      }
    });

    versionButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (versionsPanel === openVersionsPanel) {
        closeVersionsPanel();
      } else {
        closeVersionsPanel();
        versionsPanel.classList.add("open");
        openVersionsPanel = versionsPanel;
      }
    });

    recentGridEl.appendChild(tile);
  });
}

function loadRecents() {
  if (!recentGridEl) return;
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) {
      renderRecents([]);
      return;
    }
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      renderRecents([]);
      return;
    }
    renderRecents(data);
  } catch (error) {
    console.warn("Failed to load recent presentations", error);
    renderRecents([]);
  }
}

if (recentGridEl) {
  loadRecents();
  window.addEventListener("storage", (event) => {
    if (event.key === RECENTS_STORAGE_KEY) {
      loadRecents();
    }
  });

  document.addEventListener("click", (event) => {
    if (openVersionsPanel && !openVersionsPanel.contains(event.target)) {
      if (!event.target.closest(".recent-version-button")) {
        closeVersionsPanel();
      }
    }
    if (!event.target.closest(".recent-thumb-controls")) {
      closeThumbMenus();
    }
    if (
      deletePresentationOverlay &&
      deletePresentationOverlay.classList.contains("open") &&
      event.target === deletePresentationOverlay
    ) {
      closeDeletePresentationModal();
    }
    if (
      namePresentationOverlay &&
      namePresentationOverlay.classList.contains("open") &&
      event.target === namePresentationOverlay
    ) {
      closePresentationNameModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeVersionsPanel();
      closeThumbMenus();
      closeDeletePresentationModal();
      closePresentationNameModal();
    }
  });
}

if (deletePresentationCancelBtn) {
  deletePresentationCancelBtn.addEventListener("click", (event) => {
    event.preventDefault();
    closeDeletePresentationModal();
  });
}

if (deletePresentationConfirmBtn) {
  deletePresentationConfirmBtn.addEventListener("click", (event) => {
    event.preventDefault();
    if (pendingPresentationDeletionId) {
      const id = pendingPresentationDeletionId;
      pendingPresentationDeletionId = null;
      deletePresentation(id, { skipConfirm: true });
      closeDeletePresentationModal();
    } else {
      closeDeletePresentationModal();
    }
  });
}

if (namePresentationCancelBtn) {
  namePresentationCancelBtn.addEventListener("click", (event) => {
    event.preventDefault();
    closePresentationNameModal();
  });
}

if (namePresentationConfirmBtn) {
  namePresentationConfirmBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const value = namePresentationInput ? namePresentationInput.value : "";
    closePresentationNameModal();
    beginNewPresentation(value);
  });
}

if (namePresentationInput) {
  namePresentationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const value = namePresentationInput.value;
      closePresentationNameModal();
      beginNewPresentation(value);
    }
  });
}

function closeThumbMenus(except) {
  document.querySelectorAll(".recent-thumb-menu.open").forEach((menu) => {
    if (menu !== except) {
      menu.classList.remove("open");
    }
  });
}

function duplicatePresentation(presentation) {
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return;
    const recents = JSON.parse(raw);
    if (!Array.isArray(recents)) return;
    const original = recents.find((item) => item.id === presentation.id);
    if (!original) return;

    const clone = JSON.parse(JSON.stringify(original));
    clone.id = crypto.randomUUID();
    clone.name = `${original.name || "Presentation"} Copy`;
    clone.createdAt = new Date().toISOString();
    clone.lastSavedAt = clone.createdAt;
    clone.latestVersionId = clone.versions?.[0]?.id || null;

    recents.unshift(clone);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
    loadRecents();
  } catch (error) {
    console.warn("Failed to duplicate presentation", error);
  }
}

function deletePresentation(presentationId, options = {}) {
  if (!presentationId) return;
  const { skipConfirm = false } = options;
  if (!skipConfirm && deletePresentationOverlay) {
    pendingPresentationDeletionId = presentationId;
    deletePresentationOverlay.classList.add("open");
    return;
  }
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return;
    const recents = JSON.parse(raw);
    if (!Array.isArray(recents)) return;
    const updated = recents.filter((item) => item.id !== presentationId);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(updated));
    if (localStorage.getItem(CURRENT_PRESENTATION_ID_KEY) === presentationId) {
      localStorage.removeItem(CURRENT_PRESENTATION_ID_KEY);
    }
    loadRecents();
  } catch (error) {
    console.warn("Failed to delete presentation", error);
  } finally {
    if (!skipConfirm) {
      closeDeletePresentationModal();
    }
  }
}

function closeDeletePresentationModal() {
  if (!deletePresentationOverlay) return;
  deletePresentationOverlay.classList.remove("open");
  pendingPresentationDeletionId = null;
}

function sharePresentation(presentation) {
  if (!navigator.clipboard) {
    alert("Clipboard access not available.");
    return;
  }
  const shareUrl = `${window.location.origin}${window.location.pathname}?presentation=${presentation.id}`;
  navigator.clipboard.writeText(shareUrl).then(() => {
    alert("Share link copied to clipboard!");
  }).catch(() => {
    alert("Unable to copy share link.");
  });
}

function openPresentationNameModal() {
  if (!namePresentationOverlay || !namePresentationInput || !namePresentationConfirmBtn) {
    const fallback = prompt("Presentation name", "Untitled presentation");
    if (fallback === null) return;
    beginNewPresentation(fallback);
    return;
  }
  namePresentationInput.value = "";
  namePresentationOverlay.classList.add("open");
  setTimeout(() => {
    namePresentationInput.focus();
  }, 10);
}

function closePresentationNameModal() {
  if (!namePresentationOverlay) return;
  namePresentationOverlay.classList.remove("open");
  if (namePresentationInput) {
    namePresentationInput.value = "";
  }
}

function beginNewPresentation(name) {
  const trimmed = (name || "").trim();
  const finalName = trimmed.length ? trimmed : "Untitled presentation";
  try {
    localStorage.setItem(NEW_PRESENTATION_NAME_KEY, finalName);
    localStorage.removeItem(CURRENT_PRESENTATION_ID_KEY);
    localStorage.removeItem(LOAD_REQUEST_KEY);
    localStorage.removeItem(AUTOSAVE_KEY);
    localStorage.removeItem(SYNC_KEY);
    localStorage.removeItem(`${AUTOSAVE_KEY}-${newPresentationId}`);
    localStorage.removeItem(`${SYNC_KEY}-${newPresentationId}`);

    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    let recents = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          recents = parsed;
        }
      } catch (error) {
        console.warn("Failed to parse recents list", error);
      }
    }

    const newPresentationId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const blankSlide = {
      id: crypto.randomUUID(),
      title: finalName,
      backgroundColor: "#ffffff",
      backgroundImage: null,
      elements: [],
    };
    const versionId = crypto.randomUUID();
    const newEntry = {
      id: newPresentationId,
      name: finalName,
      createdAt: nowIso,
      lastSavedAt: nowIso,
      latestVersionId: versionId,
      versions: [
        {
          id: versionId,
          savedAt: nowIso,
          slides: [blankSlide],
          activeSlideIndex: 0,
        },
      ],
      preview: {
        backgroundColor: "#ffffff",
        title: finalName,
        savedLabel: "Presentation created"
      }
    };

    recents.unshift(newEntry);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
    localStorage.setItem(CURRENT_PRESENTATION_ID_KEY, newPresentationId);
    localStorage.setItem(LOAD_REQUEST_KEY, JSON.stringify({ presentationId: newPresentationId }));
    loadRecents();
  } catch (error) {
    console.warn("Failed to prepare new presentation", error);
  }
  window.location.href = "slide-editor.html";
}
