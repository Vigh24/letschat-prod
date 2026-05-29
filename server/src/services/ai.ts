import { supabase } from '../supabase';
import axios from 'axios';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function loadProviderSettings() {
  let dbProvider: string | null = null;
  let dbSystemPrompt: string | null = null;
  let dbRephrasePrompt: string | null = null;
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', ORG_ID)
      .single();
    if (org?.settings) {
      if (org.settings.ai_provider) dbProvider = org.settings.ai_provider;
      if (org.settings.system_prompt) dbSystemPrompt = org.settings.system_prompt;
      if (org.settings.rephrase_prompt) dbRephrasePrompt = org.settings.rephrase_prompt;
    }
  } catch (err) {
    console.error('Failed to load dynamic AI provider settings from DB, falling back to ENV:', err);
  }
  const provider = dbProvider || process.env.AI_PROVIDER || (process.env.OLLAMA_API_KEY ? 'ollama' : 'gemini');
  return { provider, dbSystemPrompt, dbRephrasePrompt };
}

function buildPrompt(systemPrompt: string | null, defaultPrompt: string, userMessage: string, conversationHistory: any[]) {
  const historyText = conversationHistory
    .slice(-6)
    .map(m => `[${m.sender_type === 'contact' ? 'Customer' : 'Support Agent'}]: ${m.content}`)
    .join('\n');

  return `${systemPrompt || defaultPrompt}

Conversation history:
${historyText}
[Customer]: ${userMessage}

AI Response:`;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('GEMINI_API_KEY is not configured.');
    return '';
  }

  try {
    const response = await axios({
      method: 'POST',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      headers: { 'Content-Type': 'application/json' },
      data: { contents: [{ parts: [{ text: prompt }] }] }
    });
    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply ? reply.trim() : '';
  } catch (error: any) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    return '';
  }
}

async function callOllama(prompt: string): Promise<string> {
  const apiKey = process.env.OLLAMA_API_KEY;
  const baseUrl = process.env.OLLAMA_BASE_URL || 'https://ollama.com';
  const model = process.env.OLLAMA_MODEL || 'gemma4:31b-cloud';

  if (!apiKey) {
    console.log('OLLAMA_API_KEY is not configured.');
    return '';
  }

  try {
    const response = await axios({
      method: 'POST',
      url: `${baseUrl}/api/chat`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false
      }
    });
    const reply = response.data?.message?.content;
    return reply ? reply.trim() : '';
  } catch (error: any) {
    console.error('Ollama API Error:', error.response?.data || error.message);
    return '';
  }
}

export async function generateAIResponse(userMessage: string, conversationHistory: any[]): Promise<string> {
  const { provider, dbSystemPrompt } = await loadProviderSettings();

  const defaultSystemPrompt = `You are a helpful, professional, and friendly AI support agent for "Lets Chat", a customer support service.
Your goal is to answer the customer's query directly, politely, and concisely. Keep the response under 100 words.`;

  const prompt = buildPrompt(dbSystemPrompt, defaultSystemPrompt, userMessage, conversationHistory);

  if (provider === 'ollama') {
    return callOllama(prompt);
  }
  return callGemini(prompt);
}

export async function generateAIConversationSummary(conversationId: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'Gemini API Key not configured. Unable to generate summary.';
  }

  try {
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('sender_type, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (fetchError || !messages || messages.length === 0) {
      return 'No messages found to summarize.';
    }

    const chatLog = messages
      .map(m => `[${m.sender_type === 'outgoing' ? 'Agent' : 'Customer'}] ${m.content}`)
      .join('\n');

    const prompt = `You are an expert customer service analyst. Please analyze the following chat transcript and provide a highly concise summary of:
1. The customer's primary issue or query
2. The resolution or next steps offered
3. The overall tone/sentiment

Keep the summary brief and professional (under 4 sentences). Do not use placeholders or intro text.

Chat Transcript:
${chatLog}`;

    const response = await axios({
      method: 'POST',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      headers: { 'Content-Type': 'application/json' },
      data: { contents: [{ parts: [{ text: prompt }] }] }
    });

    const summaryText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return summaryText ? summaryText.trim() : 'Failed to generate summary.';
  } catch (error: any) {
    console.error('Failed to generate AI summary:', error.response?.data || error.message);
    return `Error generating AI summary: ${error.message}`;
  }
}

export async function rephraseText(draft: string, tone: string): Promise<string> {
  const { provider, dbRephrasePrompt } = await loadProviderSettings();

  const defaultRephrasePrompt = `You are a helpful customer support communication specialist. Rephrase the following customer support agent's draft message to be more {{tone}}.
Keep the facts, amounts, links, or dates exactly the same. Do not add any new facts or make promises the agent did not make. Respond with ONLY the rephrased message, with no other conversational filler, markdown formatting (like quotes), or introductions.`;

  const rephraseInstructions = dbRephrasePrompt || defaultRephrasePrompt;
  const prompt = rephraseInstructions
    .replace('{{tone}}', tone || 'professional')
    .concat(`\n\nDraft: ${draft}`);

  if (provider === 'ollama') {
    return callOllama(prompt);
  }
  return callGemini(prompt);
}
