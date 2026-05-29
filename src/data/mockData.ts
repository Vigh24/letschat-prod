// ============================================================
// Lets Chat — Simulator Training Scenarios
// Built-in training content for the agent training simulator.
// This is NOT mock customer data — it's instructional content.
// ============================================================

import type { SimulatorScenario } from '../types';

export const simulatorScenarios: SimulatorScenario[] = [
  {
    id: 'sim-001', title: 'The Frustrated Billing Customer',
    description: 'Handle a WhatsApp customer who was double-charged and has been on hold for 40 minutes. Practice de-escalation and clear communication.',
    difficulty: 'intermediate',
    persona: {
      name: 'Rajesh Verma', mood: 'frustrated',
      backstory: 'A premium subscriber who noticed a duplicate charge on his credit card. Has already spoken to one agent who transferred him without resolution. Reached out via WhatsApp.',
      pain_points: ['Duplicate charge of ₹4,999', 'Time wasted with previous agent', 'Needs refund urgently for cash-flow reasons'],
    },
    initial_message: "I have been waiting for 40 minutes and been transferred twice already! I was charged TWICE for my subscription this month. ₹4,999 x 2 = ₹9,998 gone from my account. Fix this NOW or I'm disputing with my bank and cancelling everything. 😤",
    tags: ['billing', 'de-escalation', 'refund', 'whatsapp'],
    learning_objectives: ['Acknowledge frustration without being defensive', 'Take clear ownership of resolution', 'Set realistic timelines', 'Offer compensation appropriately'],
  },
  {
    id: 'sim-002', title: 'Confused First-Time User',
    description: 'Guide a non-technical WhatsApp user through a complex onboarding setup. Practice patience, clarity, and avoiding jargon.',
    difficulty: 'beginner',
    persona: {
      name: 'Mrs. Sunita Agarwal', mood: 'confused',
      backstory: 'A 58-year-old small business owner trying to set up the platform for her boutique. Not very tech-savvy but eager to learn. Messaged via WhatsApp.',
      pain_points: ['Cannot find the "Integrations" section', 'Overwhelmed by too many options', 'Worried she will break something'],
    },
    initial_message: "Hello, my son helped me sign up for your service but now I cannot understand how to connect it to my WhatsApp. I clicked on many buttons but nothing is working. Can you help me please? I don't want to delete something important. 🙏",
    tags: ['onboarding', 'technical-support', 'empathy', 'whatsapp'],
    learning_objectives: ['Use simple, jargon-free language', 'Break down complex steps into numbered instructions', 'Provide reassurance and encouragement', 'Confirm understanding at each step'],
  },
  {
    id: 'sim-003', title: 'Demanding Enterprise Client',
    description: 'Navigate a high-stakes WhatsApp conversation with an enterprise client threatening to churn.',
    difficulty: 'advanced',
    persona: {
      name: 'Michael Torres', mood: 'demanding',
      backstory: 'CTO of a Series B startup with a $50k/year contract. Performance SLA was missed last week (99.2% vs 99.9% promised). Contacted via WhatsApp for urgency.',
      pain_points: ['SLA breach with financial impact', 'Board presentation affected by downtime', 'Evaluating competitor platforms'],
    },
    initial_message: "Priya, I need answers. Your SLA guarantees 99.9% uptime. Last week you delivered 99.2%. That 0.7% cost us three hours of downtime during our biggest product demo of the year. Our board presentation was a disaster. I have three other vendors lined up for demos this week. What is your remediation plan?",
    tags: ['enterprise', 'sla', 'churn-risk', 'whatsapp'],
    learning_objectives: ['Acknowledge accountability without over-apologizing', 'Present concrete remediation steps', 'Leverage SLA credit policies appropriately', 'Identify and address the emotional subtext'],
  },
  {
    id: 'sim-004', title: 'Hinglish-Speaking Customer',
    description: 'Support a WhatsApp customer who alternates between Hindi and English. Practice multilingual empathy.',
    difficulty: 'intermediate',
    persona: {
      name: 'Deepak Sharma', mood: 'angry',
      backstory: 'A small shop owner from Jaipur who is not getting the promised features in his plan. Messaged on WhatsApp in Hinglish.',
      pain_points: ['Feels misled by sales team', 'Cannot use advertised features', 'Language barrier adding to frustration'],
    },
    initial_message: "Bhai, mujhe tumhare sales wale ne bola tha ki Pro plan mein unlimited storage milega. Ab 3 mahine baad pata chala ki sirf 50GB hai. Yeh toh cheating hai! Maine 12,000 rupaye diye hain annual mein. Yeh sab refund chahiye mujhe. 😠",
    tags: ['hinglish', 'billing', 'refund', 'whatsapp'],
    learning_objectives: ['Match customer language register appropriately', 'Clarify feature misunderstandings empathetically', 'Navigate refund policy while retaining the customer', 'Document the miscommunication for sales training'],
  },
];
