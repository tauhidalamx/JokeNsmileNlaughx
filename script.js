// Offline fallback jokes categorized
const FALLBACK_JOKES = {
  geek: [
    { setup: "Why do programmers prefer dark mode?", delivery: "Because light attracts bugs." },
    { setup: "There are 10 types of people in the world:", delivery: "Those who understand binary, and those who don't." },
    { setup: "Why do Java developers wear glasses?", delivery: "Because they don't C#." },
    { setup: "A SQL query walks into a bar, walks up to two tables and asks...", delivery: "'Can I join you?'" },
    { setup: "How many programmers does it take to change a light bulb?", delivery: "None. It's a hardware problem." },
    { setup: "Why did the developer go broke?", delivery: "Because he used up all his cache." }
  ],
  dad: [
    { setup: "Why don't skeletons fight each other?", delivery: "They don't have the guts." },
    { setup: "What do you call fake spaghetti?", delivery: "An impasta!" },
    { setup: "Why did the scarecrow win an award?", delivery: "Because he was outstanding in his field!" },
    { setup: "What do you call a factory that makes okay products?", delivery: "A satisfactory." },
    { setup: "How does a penguin build its house?", delivery: "Igloos it together." }
  ],
  general: [
    { setup: "I told my wife she was drawing her eyebrows too high.", delivery: "She looked surprised." },
    { setup: "Parallel lines have so much in common.", delivery: "It's a shame they'll never meet." },
    { setup: "My wife told me to stop impersonating a flamingo.", delivery: "I had to put my foot down." },
    { setup: "Why can't a nose be 12 inches long?", delivery: "Because then it would be a foot." }
  ]
};

// DOM Elements
const jokeSetup = document.getElementById('jokeSetup');
const jokeDelivery = document.getElementById('jokeDelivery');
const jokeTypeBadge = document.getElementById('jokeTypeBadge');
const loadingSpinner = document.getElementById('loadingSpinner');
const jokeContent = document.getElementById('jokeContent');
const nextJokeBtn = document.getElementById('nextJokeBtn');
const copyBtn = document.getElementById('copyBtn');
const copyTooltip = document.getElementById('copyTooltip');
const shareBtn = document.getElementById('shareBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const categoryChips = document.querySelectorAll('.chip');
const reactBtns = document.querySelectorAll('.react-btn');

let currentCategory = 'any';
let currentJokeText = '';
let isFetching = false;

// State init
function init() {
  // Restore theme
  const savedTheme = localStorage.getItem('jns_theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
  themeToggleBtn.textContent = savedTheme === 'light' ? '🌙' : '✨';

  // Attach Event Listeners
  nextJokeBtn.addEventListener('click', () => fetchJoke());
  themeToggleBtn.addEventListener('click', toggleTheme);
  copyBtn.addEventListener('click', copyJokeToClipboard);
  shareBtn.addEventListener('click', shareJoke);

  // Categories
  categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      categoryChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.getAttribute('data-category');
      fetchJoke();
    });
  });

  // Reactions
  reactBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const countSpan = btn.querySelector('.count');
      let count = parseInt(countSpan.textContent, 10) || 0;
      countSpan.textContent = count + 1;
      btn.style.transform = 'scale(1.25)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 200);
    });
  });

  // Keyboard shortcut: Space or Enter for Next Joke
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (document.activeElement.tagName !== 'BUTTON') {
        e.preventDefault();
        fetchJoke();
      }
    }
  });

  // Fetch first joke
  fetchJoke();
}

// Toggle Theme
function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('jns_theme', newTheme);
  themeToggleBtn.textContent = newTheme === 'light' ? '🌙' : '✨';
}

// Fetch with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 4000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Display joke in UI
function renderJoke(setup, delivery = '', categoryName = 'JOKE') {
  jokeSetup.textContent = setup;
  if (delivery) {
    jokeDelivery.textContent = delivery;
    jokeDelivery.classList.remove('hidden');
    currentJokeText = `${setup} — ${delivery}`;
  } else {
    jokeDelivery.textContent = '';
    jokeDelivery.classList.add('hidden');
    currentJokeText = setup;
  }

  jokeTypeBadge.textContent = categoryName.toUpperCase();

  // Reset animation
  jokeContent.style.animation = 'none';
  jokeContent.offsetHeight; // Trigger reflow
  jokeContent.style.animation = 'fadeIn 0.3s ease-in-out';
}

// Fallback selector
function getFallbackJoke(cat) {
  let list;
  if (cat === 'geek') list = FALLBACK_JOKES.geek;
  else if (cat === 'dad') list = FALLBACK_JOKES.dad;
  else if (cat === 'general') list = FALLBACK_JOKES.general;
  else {
    const all = [...FALLBACK_JOKES.geek, ...FALLBACK_JOKES.dad, ...FALLBACK_JOKES.general];
    list = all;
  }
  const item = list[Math.floor(Math.random() * list.length)];
  return { ...item, category: cat === 'any' ? 'Random' : cat };
}

// Main fetch function
async function fetchJoke() {
  if (isFetching) return;
  isFetching = true;

  // UI state
  loadingSpinner.classList.remove('hidden');
  jokeContent.classList.add('hidden');
  nextJokeBtn.disabled = true;

  try {
    let result = null;

    if (currentCategory === 'geek') {
      try {
        const res = await fetchWithTimeout('https://geek-jokes.sameerkumar.website/api?format=json', { timeout: 3500 });
        if (res.ok) {
          const data = await res.json();
          result = { setup: data.joke, delivery: '', category: 'Geek & Tech' };
        }
      } catch (e) {
        console.warn('Geek API fetch failed, trying official jokes:', e);
      }
      if (!result) {
        const res = await fetchWithTimeout('https://official-joke-api.appspot.com/jokes/programming/random', { timeout: 3000 });
        if (res.ok) {
          const data = await res.json();
          const joke = Array.isArray(data) ? data[0] : data;
          result = { setup: joke.setup, delivery: joke.punchline, category: 'Programming' };
        }
      }
    } else if (currentCategory === 'dad') {
      const res = await fetchWithTimeout('https://icanhazdadjoke.com/', {
        headers: { Accept: 'application/json' },
        timeout: 3500
      });
      if (res.ok) {
        const data = await res.json();
        result = { setup: data.joke, delivery: '', category: 'Dad Joke' };
      }
    } else if (currentCategory === 'general') {
      const res = await fetchWithTimeout('https://official-joke-api.appspot.com/random_joke', { timeout: 3500 });
      if (res.ok) {
        const data = await res.json();
        result = { setup: data.setup, delivery: data.punchline, category: data.type || 'General' };
      }
    } else {
      // Any / Random: pick randomly between sources
      const sources = ['geek', 'official', 'dad'];
      const chosen = sources[Math.floor(Math.random() * sources.length)];

      if (chosen === 'geek') {
        const res = await fetchWithTimeout('https://geek-jokes.sameerkumar.website/api?format=json', { timeout: 3000 });
        if (res.ok) {
          const data = await res.json();
          result = { setup: data.joke, delivery: '', category: 'Geek Joke' };
        }
      } else if (chosen === 'dad') {
        const res = await fetchWithTimeout('https://icanhazdadjoke.com/', {
          headers: { Accept: 'application/json' },
          timeout: 3000
        });
        if (res.ok) {
          const data = await res.json();
          result = { setup: data.joke, delivery: '', category: 'Dad Joke' };
        }
      } else {
        const res = await fetchWithTimeout('https://official-joke-api.appspot.com/random_joke', { timeout: 3000 });
        if (res.ok) {
          const data = await res.json();
          result = { setup: data.setup, delivery: data.punchline, category: data.type || 'Random' };
        }
      }
    }

    if (result) {
      renderJoke(result.setup, result.delivery, result.category);
    } else {
      throw new Error('No response from joke service');
    }
  } catch (err) {
    console.warn('Using offline joke:', err);
    const fallback = getFallbackJoke(currentCategory);
    renderJoke(fallback.setup, fallback.delivery, fallback.category);
  } finally {
    loadingSpinner.classList.add('hidden');
    jokeContent.classList.remove('hidden');
    nextJokeBtn.disabled = false;
    isFetching = false;
  }
}

// Copy to clipboard
async function copyJokeToClipboard() {
  if (!currentJokeText) return;
  try {
    await navigator.clipboard.writeText(currentJokeText);
    copyTooltip.textContent = 'Copied! 🎉';
    copyTooltip.classList.add('show');
    setTimeout(() => {
      copyTooltip.classList.remove('show');
      setTimeout(() => {
        copyTooltip.textContent = 'Copy';
      }, 200);
    }, 1500);
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }
}

// Share joke on Twitter / X
function shareJoke() {
  if (!currentJokeText) return;
  const text = encodeURIComponent(`"${currentJokeText}" - via Joke N Smile Chrome Extension 😄`);
  const url = `https://twitter.com/intent/tweet?text=${text}`;
  window.open(url, '_blank');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);