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
      
      // Show dropdown for logged-in users
      if (accountDropdown) accountDropdown.style.display = 'none';
      
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
      if (accountDropdown) accountDropdown.style.display = 'none';
      if (accountButton) {
        accountButton.style.cursor = 'default';
        accountButton.onclick = null;
      }
    } else {
      // Not logged in and not guest - redirect to login
      if (window.fadeNavigate) {
        window.fadeNavigate('./login.html');
      } else {
        window.location.href = './login.html';
      }
      return;
    }

    // Close dropdown when clicking outside (only for logged-in users)
    if (currentUser && accountDropdown) {
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
    if (logoutButton && currentUser) {
      logoutButton.addEventListener('click', () => {
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

