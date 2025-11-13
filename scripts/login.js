document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  const errorDiv = document.getElementById("loginError");

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    
    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value;

    if (!identifier || !password) {
      showError("Please enter both email/username and password.");
      return;
    }

    const result = authenticate(identifier, password);

    if (result.success) {
      setCurrentUser(result.user);
      setGuestMode(false); // Clear guest mode on login
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

