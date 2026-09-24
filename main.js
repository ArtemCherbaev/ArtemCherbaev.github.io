const links = [...document.querySelectorAll('nav a[href^="#"]')];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          for (const link of links) {
            if (link.hash === `#${entry.target.id}`)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          }
        }
    },
    { rootMargin: "-15% 0px -65% 0px" },
  );
  for (const link of links) {
    const section = document.querySelector(link.hash);
    if (section) observer.observe(section);
  }
}
