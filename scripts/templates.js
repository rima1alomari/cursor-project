document.addEventListener("DOMContentLoaded", () => {
  const templateCards = document.querySelectorAll(".template-card");
  const filterChips = document.querySelectorAll(".filter-chip");

  templateCards.forEach((card) => {
    const button = card.querySelector(".template-button");
    const name = card.dataset.template;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      console.log(name);
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
