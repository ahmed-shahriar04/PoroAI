(() => {
  function getCredit() {
    return document.querySelector(".mentor-developer-credit");
  }

  function getChatBox() {
    return document.querySelector(".prompt-console")
      || document.querySelector(".prompt-shell")
      || document.querySelector(".composer-card")
      || document.querySelector(".mentor-composer")
      || document.querySelector("textarea")?.closest(".prompt-console")
      || document.querySelector("textarea")?.closest(".prompt-shell")
      || document.querySelector("textarea")?.parentElement;
  }

  function hardAlignCredit() {
    const credit = getCredit();
    const chatBox = getChatBox();

    if (!credit || !chatBox) return;

    // Move credit outside any transformed/layout parent
    if (credit.parentElement !== document.body) {
      document.body.appendChild(credit);
    }

    const rect = chatBox.getBoundingClientRect();
    const centerX = Math.round(rect.left + rect.width / 2);

    credit.style.setProperty("position", "fixed", "important");
    credit.style.setProperty("left", centerX + "px", "important");
    credit.style.setProperty("right", "auto", "important");
    credit.style.setProperty("top", "auto", "important");
    credit.style.setProperty("bottom", "7px", "important");
    credit.style.setProperty("transform", "translateX(-50%)", "important");
    credit.style.setProperty("z-index", "99999", "important");
    credit.style.setProperty("display", "flex", "important");
    credit.style.setProperty("justify-content", "center", "important");
    credit.style.setProperty("align-items", "center", "important");
    credit.style.setProperty("white-space", "nowrap", "important");
  }

  window.hardAlignMentorCredit = hardAlignCredit;

  window.addEventListener("load", hardAlignCredit);
  window.addEventListener("resize", hardAlignCredit);
  window.addEventListener("scroll", hardAlignCredit, { passive: true });

  document.addEventListener("DOMContentLoaded", hardAlignCredit);

  setTimeout(hardAlignCredit, 50);
  setTimeout(hardAlignCredit, 200);
  setTimeout(hardAlignCredit, 600);
  setTimeout(hardAlignCredit, 1200);
  setTimeout(hardAlignCredit, 2200);

  const observer = new MutationObserver(() => {
    requestAnimationFrame(hardAlignCredit);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true
  });
})();
