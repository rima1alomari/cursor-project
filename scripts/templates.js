document.addEventListener("DOMContentLoaded", () => {
  const templateCards = document.querySelectorAll(".template-card");
  const filterChips = document.querySelectorAll(".filter-chip");

  templateCards.forEach((card) => {
    const button = card.querySelector(".template-button");
    if (!button) return;

    const name = (card.dataset.template || "").trim();
    const normalized = name.toLowerCase();

    button.addEventListener("click", (event) => {
      event.stopPropagation();

      const launchTemplate = (templateKey) => {
        try {
          localStorage.setItem("forceNewPresentation", "true");
          if (templateKey) {
            localStorage.setItem("selectedTemplate", templateKey);
          } else {
            localStorage.removeItem("selectedTemplate");
          }
        } catch (error) {
          console.warn("Unable to persist selected template", error);
        }

        window.location.href = "slide-editor.html";
      };

      if (normalized === "blank template") {
        launchTemplate("blank");
        return;
      }

      if (normalized === "business template") {
        launchTemplate("business");
        return;
      }

      launchTemplate(null);
    });
  });

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      // Placeholder for future filtering logic.
    });
  });
});
