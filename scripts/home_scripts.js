// PROFILE DROPDOWN
const profileContainer = document.querySelector(".profile-container");
const profileButton = document.querySelector(".profile-button");
const profileMenu = document.querySelector(".profile-menu");
const logoutButton = document.getElementById("logoutButton");

// PLUS / TEMPLATES
const plusContainer = document.getElementById("plusContainer");
const plusButton = document.getElementById("plusButton");
const templateButtons = document.querySelectorAll(".template-btn");

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

  // Click → go to editor
  plusButton.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "editor.html";
  });
}

// Clicking on a template -> open editor
templateButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const templateType = btn.dataset.template;
    if (templateType === "blank") {
      window.location.href = "slide-editor.html";
      return;
    }
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
