document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  if (!signupForm) return;

  const errorDiv = document.getElementById("signupError");

  signupForm.addEventListener("submit", (event) => {
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
      setCurrentUser(result.account);
      window.location.href = "./home.html";
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

