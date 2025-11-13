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
  function handleNavigation(e) {
    const target = e.currentTarget;
    const href = target.href || target.getAttribute('href');
    
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
        target.hasAttribute('data-no-fade') ||
        target.closest('.modal-overlay') ||
        target.id === 'guestButton' ||
        target.id === 'cancelGuestBtn' ||
        target.id === 'continueGuestBtn' ||
        target.classList.contains('dropdown-item')) {
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
      e.preventDefault();
      document.body.classList.add('fade-out');
      
      setTimeout(() => {
        window.location.href = href;
      }, 200);
    } catch (error) {
      // Invalid URL, let browser handle it normally
      return;
    }
  }
  
  // Attach to all links with href
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a[href]');
    if (target && target.tagName === 'A') {
      handleNavigation({ currentTarget: target, preventDefault: () => e.preventDefault() });
    }
  }, true);
  
  // Expose function for programmatic navigation
  window.fadeNavigate = function(url) {
    if (document.body.classList.contains('fade-out')) {
      return;
    }
    document.body.classList.add('fade-out');
    setTimeout(() => {
      window.location.href = url;
    }, 200);
  };
})();
