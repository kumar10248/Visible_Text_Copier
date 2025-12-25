// Show toast notification instead of alert
function showToast(message, type = 'success') {
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3'
  };
  
  const existing = document.getElementById('visible-copy-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'visible-copy-toast';
  toast.innerHTML = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${colors[type]};
    color: white;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Main content script function
function copyVisibleText() {
  // Check if there's selected text - copy only selection if exists
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  
  if (selectedText && selectedText.length > 0) {
    navigator.clipboard.writeText(selectedText)
      .then(() => showToast(`✅ Selected text copied! (${selectedText.length} chars)`, 'success'))
      .catch(err => showToast('❌ Clipboard write failed: ' + (err?.message || err), 'error'));
    return { charCount: selectedText.length, type: 'selection' };
  }

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

    // Skip script, style, noscript, iframe elements
    if (["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "SVG"].includes(el.tagName)) return "";

    let text = "";
    
    // Headings with hierarchy
    if (el.tagName === "H1") text += "\n# " + el.innerText.trim() + "\n";
    else if (el.tagName === "H2") text += "\n## " + el.innerText.trim() + "\n";
    else if (el.tagName === "H3") text += "\n### " + el.innerText.trim() + "\n";
    else if (["H4", "H5", "H6"].includes(el.tagName)) text += "\n#### " + el.innerText.trim() + "\n";
    
    // Code blocks
    else if (el.tagName === "PRE" || el.tagName === "CODE") {
      const codeText = el.innerText.trim();
      if (el.tagName === "PRE") text += "\n```\n" + codeText + "\n```\n";
      else text += "`" + codeText + "`";
    }
    
    // Links - show URL in parentheses
    else if (el.tagName === "A" && el.href) {
      const linkText = el.innerText.trim();
      const href = el.href;
      if (linkText && !href.startsWith('javascript:')) {
        text += linkText + " (" + href + ")";
      } else {
        text += linkText;
      }
    }
    
    // Tables
    else if (el.tagName === "TABLE") {
      text += "\n" + formatTable(el) + "\n";
    }
    
    // Blockquotes
    else if (el.tagName === "BLOCKQUOTE") {
      const quoteText = el.innerText.trim().split('\n').map(line => '> ' + line).join('\n');
      text += "\n" + quoteText + "\n";
    }
    
    // Paragraphs and divs
    else if (["P", "DIV", "SECTION", "ARTICLE"].includes(el.tagName)) {
      text += "\n";
      for (let child of el.childNodes) {
        text += getVisibleTextWithFormatting(child);
      }
    }
    
    // List items
    else if (el.tagName === "LI") {
      const parent = el.parentElement;
      const isOrdered = parent?.tagName === "OL";
      const index = isOrdered ? Array.from(parent.children).indexOf(el) + 1 : null;
      const prefix = isOrdered ? `${index}. ` : "• ";
      text += prefix;
      for (let child of el.childNodes) {
        text += getVisibleTextWithFormatting(child);
      }
      text += "\n";
    }
    
    // Line breaks
    else if (el.tagName === "BR") text += "\n";
    else if (el.tagName === "HR") text += "\n---\n";
    
    // Strong/Bold
    else if (["STRONG", "B"].includes(el.tagName)) text += "**" + el.innerText.trim() + "**";
    
    // Emphasis/Italic
    else if (["EM", "I"].includes(el.tagName)) text += "_" + el.innerText.trim() + "_";
    
    // Default: process children
    else {
      for (let child of el.childNodes) {
        text += getVisibleTextWithFormatting(child);
      }
    }

    return text;
  }
  
  // Format tables nicely
  function formatTable(table) {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return '';
    
    let result = [];
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('th, td');
      const rowText = Array.from(cells).map(cell => cell.innerText.trim()).join(' | ');
      result.push('| ' + rowText + ' |');
      
      // Add separator after header row
      if (rowIndex === 0 && row.querySelector('th')) {
        result.push('|' + Array.from(cells).map(() => '---').join('|') + '|');
      }
    });
    return result.join('\n');
  }

  const text = getVisibleTextWithFormatting(document.body)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!text) {
    showToast("⚠️ No visible readable text found!", 'warning');
    return { charCount: 0, type: 'none' };
  }

  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  navigator.clipboard.writeText(text)
    .then(() => showToast(`✅ Copied! ${charCount.toLocaleString()} chars, ~${wordCount.toLocaleString()} words`, 'success'))
    .catch(err => showToast('❌ Clipboard write failed: ' + (err?.message || err), 'error'));
  
  return { charCount, wordCount, type: 'full' };
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: copyVisibleText,
    });
    
    // Update badge with character count
    const result = results?.[0]?.result;
    if (result && result.charCount > 0) {
      const badgeText = result.charCount > 9999 
        ? Math.round(result.charCount / 1000) + 'k' 
        : result.charCount.toString();
      chrome.action.setBadgeText({ text: badgeText, tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tab.id });
      
      // Clear badge after 5 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
      }, 5000);
    }
  } catch (err) {
    console.error('Visible Copy Error:', err);
  }
});



