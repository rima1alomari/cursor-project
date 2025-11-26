document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  if (!signupForm) return;

  const errorDiv = document.getElementById("signupError");

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !email || !password) {
      showError("Please fill in all fields.");
      return;
    }

    if (password.length < 4) {
      showError("Password must be at least 4 characters long.");
      return;
    }

    const result = registerAccount(username, email, password);

    if (result.success) {
      // Create Firebase Auth user for Firestore access
      // This must happen before setting the current user to ensure Firebase Auth is ready
      if (typeof createFirebaseAuthUser === 'function') {
        try {
          console.log('Creating Firebase Auth user for:', email);
          const firebaseAuthResult = await createFirebaseAuthUser(email, password);
          if (firebaseAuthResult.success) {
            console.log('✅ Firebase Auth user created successfully');
          } else {
            console.warn('⚠️ Firebase Auth user creation failed:', firebaseAuthResult.error);
            console.warn('⚠️ User can still use the app with localStorage, but Firestore will not work.');
            // Continue with signup even if Firebase Auth fails (fallback to localStorage)
          }
        } catch (error) {
          console.error('❌ Firebase Auth error:', error);
          console.warn('⚠️ User can still use the app with localStorage, but Firestore will not work.');
          // Continue with signup even if Firebase Auth fails (fallback to localStorage)
        }
      } else {
        console.warn('⚠️ Firebase Auth functions not available. Make sure firebase.js is loaded.');
      }
      
      setCurrentUser(result.account);
      
      // Small delay to ensure Firebase Auth state is set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (window.fadeNavigate) {
        window.fadeNavigate("./home.html");
      } else {
        window.location.href = "./home.html";
      }
    } else {
      showError(result.error || "Failed to create account. Please try again.");
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

