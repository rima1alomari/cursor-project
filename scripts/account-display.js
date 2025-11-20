// Shared account display functionality with profile integration

/**
 * Initialize account display with profile picture support
 */
function initAccountDisplay() {
  const accountDisplay = document.getElementById('accountDisplay');
  const accountButton = document.getElementById('accountButton');
  const accountGreeting = document.getElementById('accountGreeting');
  const accountDropdown = document.getElementById('accountDropdown');
  const accountAvatar = document.getElementById('accountAvatar');
  const accountIcon = document.getElementById('accountIcon');
  const logoutButton = document.getElementById('logoutButton');
  const profileLink = document.querySelector('[href="profile.html"]');

  if (!accountDisplay) return;

  function updateAccountDisplay() {
    const currentUser = getCurrentUser();
    const isGuest = isGuestMode();

    // Helper to render dropdown content
    function renderDropdownForUser(isLoggedIn) {
      if (!accountDropdown) return;
      if (isLoggedIn) {
        accountDropdown.innerHTML = `
          <a href="profile.html" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </a>
          <a href="settings.html" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 21 11h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </a>
          <button class="dropdown-item dropdown-item--logout" id="logoutButton">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        `;
      } else {
        accountDropdown.innerHTML = `
          <a href="settings.html" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 21 11h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </a>
        `;
      }
    }

    if (currentUser) {
      let userName = currentUser.username || currentUser.email || 'User';
      let profilePicture = null;
      
      // Try to get profile data if profile.js is available
      if (typeof getUserWithProfile === 'function') {
        try {
          const user = getUserWithProfile(currentUser.id);
          userName = user.fullName || userName;
          profilePicture = getUserProfilePicture(currentUser.id);
        } catch (err) {
          console.warn('Failed to load profile data', err);
        }
      }
      
      accountGreeting.textContent = `Hello, ${userName}!`;
      accountDisplay.style.display = 'flex';
      
      // Update avatar
      if (accountAvatar && accountIcon) {
        if (profilePicture) {
          accountAvatar.src = profilePicture;
          accountAvatar.style.display = 'block';
          accountIcon.style.display = 'none';
        } else {
          // Show initials avatar
          accountAvatar.style.display = 'none';
          accountIcon.style.display = 'block';
        }
      }
      
      // Render dropdown for logged-in users
      if (accountDropdown) {
        renderDropdownForUser(true);
        accountDropdown.style.display = 'none';
      }
      
      // Toggle dropdown or navigate to profile
      if (accountButton) {
        accountButton.style.cursor = 'pointer';
        accountButton.addEventListener('click', (e) => {
          e.stopPropagation();
          // If dropdown exists, toggle it; otherwise navigate to profile
          if (accountDropdown) {
            const isVisible = accountDropdown.style.display === 'block';
            accountDropdown.style.display = isVisible ? 'none' : 'block';
          } else {
            // Navigate to profile if no dropdown
            if (window.fadeNavigate) {
              window.fadeNavigate('./profile.html');
            } else {
              window.location.href = './profile.html';
            }
          }
        });
      }
    } else if (isGuest) {
      accountGreeting.textContent = 'Hello, Guest!';
      accountDisplay.style.display = 'flex';
      if (accountAvatar) accountAvatar.style.display = 'none';
      if (accountIcon) accountIcon.style.display = 'block';
      if (accountDropdown) {
        renderDropdownForUser(false); // Settings only
        accountDropdown.style.display = 'none';
      }
      if (accountButton) {
        accountButton.style.cursor = 'pointer';
        accountButton.addEventListener('click', (e) => {
          e.stopPropagation();
          if (accountDropdown) {
            const isVisible = accountDropdown.style.display === 'block';
            accountDropdown.style.display = isVisible ? 'none' : 'block';
          }
        });
      }
    } else {
      // Not logged in and not explicitly in guest mode
      // Only redirect on truly protected pages; otherwise behave as guest
      try {
        const path = (window.location.pathname || '').toLowerCase();
        const page = path.split('/').pop() || 'index.html';
        const PROTECTED_PAGES = ['profile.html'];
        if (PROTECTED_PAGES.includes(page)) {
          if (window.fadeNavigate) {
            window.fadeNavigate('./login.html');
          } else {
            window.location.href = './login.html';
          }
          return;
        }
      } catch (_) {}
      
      // Treat as guest UI without persisting guest mode
      accountGreeting.textContent = 'Hello, Guest!';
      accountDisplay.style.display = 'flex';
      if (accountAvatar) accountAvatar.style.display = 'none';
      if (accountIcon) accountIcon.style.display = 'block';
      if (accountDropdown) {
        renderDropdownForUser(false); // Settings only
        accountDropdown.style.display = 'none';
      }
      if (accountButton) {
        accountButton.style.cursor = 'pointer';
        accountButton.addEventListener('click', (e) => {
          e.stopPropagation();
          if (accountDropdown) {
            const isVisible = accountDropdown.style.display === 'block';
            accountDropdown.style.display = isVisible ? 'none' : 'block';
          }
        });
      }
    }

    // Close dropdown when clicking outside (only for logged-in users)
    if ((currentUser || isGuest) && accountDropdown) {
      document.addEventListener('click', (e) => {
        if (accountDisplay && !accountDisplay.contains(e.target)) {
          accountDropdown.style.display = 'none';
        }
      });
    }

    // Profile link
    if (profileLink && currentUser) {
      profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.fadeNavigate) {
          window.fadeNavigate('./profile.html');
        } else {
          window.location.href = './profile.html';
        }
      });
    }

    // Logout functionality (only for logged-in users)
    const logoutBtnEl = document.getElementById('logoutButton');
    if (logoutBtnEl && currentUser) {
      logoutBtnEl.addEventListener('click', () => {
        logout();
        if (window.fadeNavigate) {
          window.fadeNavigate('./index.html');
        } else {
          window.location.href = './index.html';
        }
      });
    }
  }

  updateAccountDisplay();
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccountDisplay);
} else {
  initAccountDisplay();
}

