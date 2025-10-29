chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      function getVisibleTextWithFormatting(el) {
        if (el.nodeType === Node.TEXT_NODE) {
          const text = el.textContent.trim();
          const parent = el.parentElement;
          if (!parent) return "";
          const style = window.getComputedStyle(parent);
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0"
          ) return "";
          return text;
        }

        if (el.nodeType !== Node.ELEMENT_NODE) return "";

        const style = window.getComputedStyle(el);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          el.getAttribute("aria-hidden") === "true" ||
          el.classList.contains("rc-A11yScreenReaderOnly") ||
          el.getAttribute("data-ai-instructions") === "true"
        ) return "";

        let text = "";
        if (["P", "DIV", "SECTION"].includes(el.tagName)) text += "\n";
        if (["H1", "H2", "H3", "H4"].includes(el.tagName))
          text += "\n=== " + el.innerText.trim() + " ===\n";
        else {
          for (let child of el.childNodes) {
            text += getVisibleTextWithFormatting(child);
          }
        }

        if (["LI"].includes(el.tagName)) text = "• " + text + "\n";
        if (["BR"].includes(el.tagName)) text += "\n";
        return text;
      }

      const text = getVisibleTextWithFormatting(document.body)
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (!text) {
        alert("⚠️ No visible readable text found!");
        return;
      }

      navigator.clipboard
        .writeText(text)
        .then(() => alert("✅ Visible formatted text copied!"))
        .catch((err) =>
          alert("❌ Clipboard write failed: " + (err?.message || err))
        );
    },
  });
});
