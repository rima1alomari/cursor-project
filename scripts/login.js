document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  const errorDiv = document.getElementById("loginError");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value;

    if (!identifier || !password) {
      showError("Please enter both email/username and password.");
      return;
    }

    const result = authenticate(identifier, password);

    if (result.success) {
      // Authenticate with Firebase Auth for Firestore access
      // This must happen before setting the current user to ensure Firebase Auth is ready
      if (typeof authenticateWithFirebase === 'function' && result.user && result.user.email) {
        try {
          console.log('Authenticating with Firebase Auth for:', result.user.email);
          const firebaseAuthResult = await authenticateWithFirebase(result.user.email, password);
          if (firebaseAuthResult.success) {
            console.log('✅ Firebase Auth authentication successful');
          } else {
            console.warn('⚠️ Firebase Auth authentication failed:', firebaseAuthResult.error);
            console.warn('⚠️ User can still use the app with localStorage, but Firestore will not work.');
            // Continue with login even if Firebase Auth fails (fallback to localStorage)
          }
        } catch (error) {
          console.error('❌ Firebase Auth error:', error);
          console.warn('⚠️ User can still use the app with localStorage, but Firestore will not work.');
          // Continue with login even if Firebase Auth fails (fallback to localStorage)
        }
      } else {
        console.warn('⚠️ Firebase Auth functions not available. Make sure firebase.js is loaded.');
        if (!result.user || !result.user.email) {
          console.warn('⚠️ User object missing email. Cannot authenticate with Firebase Auth.');
        }
      }
      
      setCurrentUser(result.user);
      setGuestMode(false); // Clear guest mode on login
      
      // Small delay to ensure Firebase Auth state is set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (window.fadeNavigate) {
        window.fadeNavigate("./home.html");
      } else {
        window.location.href = "./home.html";
      }
    } else {
      showError(result.error || "Invalid credentials. Please try again.");
    }
  });

  function showError(message) {
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
      // Smooth fade-in animation
      errorDiv.style.opacity = "0";
      setTimeout(() => {
        errorDiv.style.transition = "opacity 0.3s ease";
        errorDiv.style.opacity = "1";
      }, 10);
    }
  }
});

