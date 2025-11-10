// PROFILE DROPDOWN
const profileContainer = document.querySelector(".profile-container");
const profileButton = document.querySelector(".profile-button");
const profileMenu = document.querySelector(".profile-menu");
const logoutButton = document.getElementById("logoutButton");

// SETTINGS POPUP
const settingsTrigger = document.getElementById("settingsTrigger");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsModal = document.querySelector(".settings-modal");

// TEMPLATES
const templateButtons = document.querySelectorAll(".template-btn");
const templatePlus = document.getElementById("templatePlus");
const quickActionButtons = document.querySelectorAll(".quick-action");

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

document.addEventListener("click", () => {
  if (profileContainer) {
    profileContainer.classList.remove("open");
    if (profileButton) {
      profileButton.setAttribute("aria-expanded", "false");
    }
  }
});

// --- TEMPLATE BUTTONS ---
templateButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    const templateType = btn.dataset.template;
    if (templateType === "blank") {
      window.location.href = "blank.html";
    } else {
      window.location.href = "slide-editor.html";
    }
  });
});

if (templatePlus) {
  templatePlus.addEventListener("click", () => {
    window.location.href = "templates.html";
  });
}

quickActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    switch (action) {
      case "blank":
        window.location.href = "blank.html";
        break;
      case "import":
        window.location.href = "slide-editor.html";
        break;
      case "recent":
        window.location.href = "slide-editor.html#recent";
        break;
      default:
        break;
    }
  });
});

// --- SETTINGS POPUP LOGIC ---

if (settingsTrigger && settingsOverlay) {
  settingsTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsOverlay.classList.add("open");
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

if (settingsOverlay) {
  settingsOverlay.addEventListener("click", () => {
    settingsOverlay.classList.remove("open");
  });
}

if (settingsModal) {
  settingsModal.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}
