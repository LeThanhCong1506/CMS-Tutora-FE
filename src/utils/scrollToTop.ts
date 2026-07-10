// auto scroll to top after page change
export const scrollToTop = () => {
  const contentArea = document.getElementById('portal-content-area');
  if (contentArea) {
    contentArea.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};