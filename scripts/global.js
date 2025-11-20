// Global page transition script
(function() {
  'use strict';
  
  // Ensure body fades in on page load
  // The body starts with opacity: 0 and has animation in CSS
  // Wait for DOM to be ready to ensure animation plays
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Force reflow to trigger animation
      void document.body.offsetHeight;
    });
  } else {
    // DOM already loaded, force reflow immediately
    void document.body.offsetHeight;
  }
  
  // Handle fade-out on navigation
  function handleNavigation(event) {
     const link = event.currentTarget;
    if (link.dataset.customNav === 'true') {
      return;
    }
    const href = link.getAttribute('href');
    
    // Guest access guard for restricted pages (Projects, Teams)
    try {
      // Only block when explicitly in guest mode
      if (typeof isGuestMode === 'function' && isGuestMode() === true && typeof href === 'string') {
        const targetPath = href.split('?')[0].split('#')[0];
        const isRestricted =
          targetPath.endsWith('projects.html') ||
          targetPath.endsWith('teams.html');
        if (isRestricted) {
          event.preventDefault();
          showGuestAccessModal();
          return;
        }
      }
    } catch (_) {
      // If auth utils aren't available yet, fall through to normal behavior
    }
    
    // Skip if:
    // - No href
    // - Anchor link (same page)
    // - Already fading out
    // - Modal trigger or special button
    // - Has data-no-fade attribute
    // - Is inside a modal
    if (!href || 
        href.startsWith('#') ||
        document.body.classList.contains('fade-out') ||
        link.hasAttribute('data-no-fade') ||
        link.closest('.modal-overlay') ||
        link.id === 'guestButton' ||
        link.id === 'cancelGuestBtn' ||
        link.id === 'continueGuestBtn' ||
        link.classList.contains('dropdown-item')) {
      return;
    }
    
    // Check if it's an internal link
    try {
      const url = new URL(href, window.location.href);
      const isExternal = url.hostname !== '' && url.hostname !== window.location.hostname;
      
      if (isExternal) {
        // External link, let browser handle normally
        return;
      }
      
      // Internal link - add fade-out
      event.preventDefault();
      document.body.classList.add('fade-out');
      
      setTimeout(() => {
        window.location.href = href;
      }, 200);
    } catch (error) {
      // Invalid URL, let browser handle it normally
      return;
    }
  }
  
  // Create and show a modal prompting guests to log in
  function showGuestAccessModal() {
    // If already exists, just show it
    let modal = document.getElementById('guestAccessModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'guestAccessModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <h3 class="modal-title">Log in required</h3>
          <p class="modal-message">Sorry, but to use this feature you need to log in.</p>
          <div class="modal-actions">
            <button id="cancelGuestBtn" class="btn btn-outline">Cancel</button>
            <button id="continueGuestBtn" class="btn btn-primary">Log in</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Wire up actions
      const cancelBtn = modal.querySelector('#cancelGuestBtn');
      const continueBtn = modal.querySelector('#continueGuestBtn');
      
      function closeModal() {
        // Animate close
        modal.classList.add('closing');
        setTimeout(() => {
          modal.remove();
        }, 200);
      }
      
      cancelBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
      
      continueBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        // Navigate to login
        if (window.fadeNavigate) {
          window.fadeNavigate('./login.html');
        } else {
          window.location.href = './login.html';
        }
      });
      
      // Close when clicking outside content
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }
  }
  
  // Attach to all links with href
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a[href]');
    if (target && target.tagName === 'A') {
      handleNavigation({ currentTarget: target, preventDefault: () => e.preventDefault() });
    }
  }, true);
  
  // Highlight restricted links for guests
  function applyGuestHighlights() {
    try {
      const guest = (typeof isGuestMode === 'function') ? isGuestMode() === true : false;
      const restrictedSelectors = ['a[href$="projects.html"]', 'a[href$="teams.html"]'];
      const links = document.querySelectorAll(restrictedSelectors.join(','));
      links.forEach((a) => {
        if (guest) {
          a.classList.add('nav-link--restricted');
        } else {
          a.classList.remove('nav-link--restricted');
        }
      });
    } catch (_) {
      // ignore
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGuestHighlights);
  } else {
    applyGuestHighlights();
  }
  
  // Expose function for programmatic navigation
  window.fadeNavigate = function(url) {
    try {
      if (typeof isGuestMode === 'function' && isGuestMode() === true && typeof url === 'string') {
        const targetPath = url.split('?')[0].split('#')[0];
        const isRestricted =
          targetPath.endsWith('projects.html') ||
          targetPath.endsWith('teams.html');
        if (isRestricted) {
          showGuestAccessModal();
          return;
        }
      }
    } catch (_) {
      // ignore
    }
    if (document.body.classList.contains('fade-out')) {
      return;
    }
    document.body.classList.add('fade-out');
    setTimeout(() => {
      window.location.href = url;
    }, 200);
  };
})();
