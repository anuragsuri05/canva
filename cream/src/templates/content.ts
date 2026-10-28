// Topic content packs: generic, professional placeholder copy for every template topic.
import { Rng } from './rng';
import { PACKS_A } from './contentA';
import { PACKS_B } from './contentB';

export interface TopicPack {
  id: string;
  label: string; // "Coffee Shop"
  brands: string[]; // fictional business names
  headlines: string[]; // 2–5 words
  taglines: string[]; // short supporting line
  body: string[]; // 1–2 sentences
  ctas: string[];
  items: string[]; // services / features / list items
  stats: [string, string][]; // value, label
  quotes: [string, string][]; // quote, author
  event: string; // event name
  offer: string; // promo headline e.g. "20% Off"
  sections: string[]; // deck / doc sections
  menu?: [string, string, string][]; // item, description, price
}

export const TOPICS: TopicPack[] = [...PACKS_A, ...PACKS_B];
export const topicById = (id: string) => TOPICS.find((t) => t.id === id) ?? TOPICS[0];

export const PEOPLE = [
  'Olivia Wilson', 'Juliana Silva', 'Lorna Alvarado', 'Daniel Gallego', 'Hannah Morales', 'Claudia Alves', 'Marceline Anderson',
  'Benjamin Shah', 'Avery Davis', 'Harper Russo', 'Chidi Eze', 'Aaron Loeb', 'Rufus Stewart', 'Matt Zhang', 'Yael Amari', 'Drew Feig',
];
export const ROLES = ['Chief Executive Officer', 'Creative Director', 'Marketing Manager', 'Head of Operations', 'Lead Designer', 'Product Manager', 'Project Coordinator', 'Senior Consultant'];
export const CONTACT = {
  phone: '+123-456-7890',
  email: 'hello@reallygreatsite.com',
  web: 'www.reallygreatsite.com',
  address: '123 Anywhere St., Any City',
  social: '@reallygreatsite',
};
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Picked copy for one template build — every field resolved once so pages stay consistent. */
export interface Copy {
  topic: TopicPack;
  brand: string;
  headline: string;
  headline2: string;
  tagline: string;
  body: string;
  body2: string;
  cta: string;
  items: string[];
  stats: [string, string][];
  quote: [string, string];
  event: string;
  offer: string;
  date: string;
  time: string;
  people: string[];
  roles: string[];
  sections: string[];
  menu: [string, string, string][];
  year: number;
}

export function pickCopy(topic: TopicPack, rng: Rng): Copy {
  const hs = rng.shuffle(topic.headlines);
  const bs = rng.shuffle(topic.body);
  const m = rng.int(12);
  const day = 1 + rng.int(28);
  const hour = 5 + rng.int(4);
  return {
    topic,
    brand: rng.pick(topic.brands),
    headline: hs[0],
    headline2: hs[1] ?? hs[0],
    tagline: rng.pick(topic.taglines),
    body: bs[0],
    body2: bs[1] ?? bs[0],
    cta: rng.pick(topic.ctas),
    items: rng.shuffle(topic.items),
    stats: rng.shuffle(topic.stats),
    quote: rng.pick(topic.quotes),
    event: topic.event,
    offer: topic.offer,
    date: `${MONTHS[m]} ${day}, 2026`,
    time: `${hour}:00 PM – ${hour + 3}:00 PM`,
    people: rng.shuffle(PEOPLE),
    roles: rng.shuffle(ROLES),
    sections: topic.sections,
    menu: topic.menu ?? DEFAULT_MENU,
    year: 2026,
  };
}

const DEFAULT_MENU: [string, string, string][] = [
  ['Garden Salad', 'Seasonal greens, cherry tomato, lemon dressing', '12'],
  ['Tomato Soup', 'Slow-roasted tomatoes, basil, toasted bread', '9'],
  ['Grilled Chicken', 'Herb marinade, roasted vegetables', '21'],
  ['Pasta Primavera', 'Fresh pasta, spring vegetables, parmesan', '18'],
  ['Fish of the Day', 'Market catch, potatoes, salsa verde', '24'],
  ['Chocolate Tart', 'Dark chocolate, sea salt, cream', '10'],
  ['Lemon Cake', 'Citrus sponge, light glaze', '8'],
  ['Fresh Juice', 'Orange, apple or carrot', '6'],
];
