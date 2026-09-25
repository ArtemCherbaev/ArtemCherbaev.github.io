// Runs before first paint, so a visitor who chose a theme never sees the other
// one flash. Without a stored choice the page follows the system setting.
(function () {
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {
    // Storage can be unavailable (private windows, blocked cookies); the system theme applies.
  }
})();
