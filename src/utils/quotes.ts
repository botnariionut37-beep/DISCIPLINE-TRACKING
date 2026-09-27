import { Quote } from '../types';

export const DISCIPLINE_QUOTES: Quote[] = [
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle"
  },
  {
    text: "Associate with people who are likely to improve you.",
    author: "Seneca"
  },
  {
    text: "At dawn, when you have trouble getting out of bed, tell yourself: 'I have to go to work — as cereal/human being.'",
    author: "Marcus Aurelius"
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn"
  },
  {
    text: "He who has a why to live can bear almost any how.",
    author: "Friedrich Nietzsche"
  },
  {
    text: "It is not that we have a short time to live, but that we waste a lot of it.",
    author: "Seneca"
  },
  {
    text: "If you accomplish something good with hard work, the labor passes quickly, but the good remains.",
    author: "Musonius Rufus"
  },
  {
    text: "Self-respect is the fruit of discipline; the sense of dignity grows with the ability to say no to oneself.",
    author: "Abraham Joshua Heschel"
  },
  {
    text: "The first and best victory is to conquer self.",
    author: "Plato"
  },
  {
    text: "Small daily improvements over time lead to stunning results.",
    author: "Robin Sharma"
  },
  {
    text: "Rule your mind or it will rule you.",
    author: "Horace"
  },
  {
    text: "Great things are done by a series of small things brought together.",
    author: "Vincent Van Gogh"
  }
];

export function getRandomQuote(seed?: string): Quote {
  if (seed) {
    // Return a stable quote for the day based on date string seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DISCIPLINE_QUOTES.length;
    return DISCIPLINE_QUOTES[index];
  }
  const randomIndex = Math.floor(Math.random() * DISCIPLINE_QUOTES.length);
  return DISCIPLINE_QUOTES[randomIndex];
}
