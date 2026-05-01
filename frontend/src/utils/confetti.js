// src/utils/confetti.js

export const triggerConfetti = () => {
  const colors = ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const particles = 50;

  for (let i = 0; i < particles; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    
    // Random properties
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100 + 'vw';
    const animDuration = 2 + Math.random() * 2 + 's';
    const size = 5 + Math.random() * 10 + 'px';
    
    el.style.cssText = `
      position: fixed;
      top: -20px;
      left: ${left};
      width: ${size};
      height: ${size};
      background: ${color};
      border-radius: 50%;
      opacity: ${0.8 + Math.random() * 0.2};
      pointer-events: none;
      z-index: 9999;
      animation: confettiFall ${animDuration} linear forwards;
      transform: rotate(${Math.random() * 360}deg);
    `;
    
    document.body.appendChild(el);

    // Remove element after animation
    setTimeout(() => {
      el.remove();
    }, 4000);
  }
};