// ============================================================
// Lets Chat — Core Type Definitions
// WhatsApp-First Customer Support & Ticketing Platform
// ============================================================

export type UUID = string;

export type UserRole = 'admin' | 'agent' | 'supervisor';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'snoozed' | 'awaiting_response';
export type ChannelType = 'web_widget' | 'email' | 'whatsapp' | 'instagram' | 'api';
export type MessageType = 'incoming' | 'outgoing' | 'activity' | 'ai_suggestion';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type IntentCategory =
  | 'billing_inquiry' | 'technical_support' | 'account_management'
  | 'general_query' | 'complaint' | 'sales_inquiry' | 'refund_request' | 'unknown';
export type CustomerTier = 'enterprise' | 'premium' | 'standard' | 'free';

export interface Organization {
  id: UUID; name: string; slug: string; plan: 'free' | 'pro' | 'enterprise';
  settings: OrganizationSettings; created_at: string;
}
export interface OrganizationSettings {
  ai_enabled: boolean; widget_color: string; widget_position: 'bottom-right' | 'bottom-left';
  business_hours: { start: string; end: string; timezone: string }; auto_assignment: boolean;
}
export interface User {
  id: UUID; organization_id: UUID; email: string; full_name: string; avatar_url: string | null;
  role: UserRole; is_online: boolean; last_seen_at: string; created_at: string; team?: string;
}
export interface Contact {
  id: UUID; organization_id: UUID; email: string | null; phone: string | null;
  full_name: string; avatar_url: string | null; whatsapp_number?: string;
  metadata: Record<string, unknown>; created_at: string;
}
export interface Channel {
  id: UUID; organization_id: UUID; name: string; channel_type: ChannelType;
  is_active: boolean; config: ChannelConfig; created_at: string;
}
export interface ChannelConfig {
  phone_number_id?: string; waba_id?: string; smtp_host?: string; imap_host?: string;
  email_address?: string; allowed_domains?: string[]; widget_color?: string;
  webhook_url?: string; instagram_page_id?: string; instagram_business_id?: string;
}
export interface Conversation {
  id: UUID; organization_id: UUID; contact_id: UUID; channel_id: UUID;
  assigned_agent_id: UUID | null; status: ConversationStatus; priority: Priority;
  subject: string | null; ticket_id: string; intent: IntentCategory | null;
  sentiment_score: number | null; first_response_at: string | null;
  resolved_at: string | null; snoozed_until: string | null; tags: string[];
  metadata: Record<string, unknown>; created_at: string; updated_at: string;
  contact?: Contact; channel?: Channel; assigned_agent?: User;
  last_message?: Message; unread_count?: number;
}
export interface Message {
  id: UUID; conversation_id: UUID; sender_id: UUID | null;
  sender_type: 'agent' | 'contact' | 'bot' | 'system'; message_type: MessageType;
  content: string; status: MessageStatus; attachments: Attachment[];
  metadata: MessageMetadata; ai_processed: boolean; created_at: string;
  updated_at: string; sender?: User | Contact; is_internal_note?: boolean;
}
export interface Attachment { id: UUID; file_name: string; file_size: number; content_type: string; url: string; }
export interface MessageMetadata {
  intent?: IntentCategory; sentiment?: number; suggested_reply?: string;
  tone?: 'professional' | 'friendly' | 'empathetic' | 'concise';
  whatsapp_message_id?: string; email_message_id?: string;
  sender_name?: string;
  status_errors?: any[];
  is_internal?: boolean;
  reply_to_message?: {
    id: string;
    content: string;
    sender_type: string;
  };
}
export interface RephraserRequest {
  draft: string; conversation_id: UUID;
  context_messages: Pick<Message, 'content' | 'sender_type'>[];
  target_tone: 'professional' | 'friendly' | 'empathetic' | 'concise';
  target_language: 'en' | 'hinglish' | 'hi';
}
export interface RephraserResponse {
  original: string; rephrased: string; tone_applied: string;
  intent_detected: IntentCategory; confidence_score: number;
  alternatives: string[]; processing_time_ms: number;
}
export interface IntentClassification {
  intent: IntentCategory; confidence: number;
  sub_intents: { label: string; score: number }[];
  suggested_tags: string[]; escalation_recommended: boolean;
}
export interface Tag {
  id: UUID; organization_id: UUID; name: string; color: string; created_at: string;
}
export interface TagRule {
  id: UUID; tag: string; description: string; keywords: string[];
  intent: IntentCategory; auto_response_enabled: boolean;
  auto_response_template: string; escalation_trigger: boolean;
  sentiment_threshold: number | null; priority_override: Priority | null;
  team_routing: string | null; created_at: string;
  sample_queries: string[]; confidence_threshold: number;
}
export interface AutoResponse {
  id: UUID; name: string; trigger_intent: IntentCategory; trigger_tags: string[];
  response_template: string; is_active: boolean; send_delay_seconds: number;
  fallback_to_agent: boolean; confidence_threshold: number;
}
export interface EscalationRule {
  id: UUID; name: string;
  conditions: { sentiment_below?: number; keywords?: string[]; repeated_messages?: number; no_resolution_minutes?: number; customer_tier?: CustomerTier[]; };
  actions: { assign_to_team?: string; priority_upgrade?: Priority; notify_supervisor?: boolean; send_template?: string; };
  is_active: boolean;
}
export interface TrainingFlow { id: UUID; name: string; steps: TrainingFlowStep[]; is_active: boolean; }
export interface TrainingFlowStep {
  id: string; type: 'classify' | 'auto_respond' | 'check_sentiment' | 'assign_agent' | 'escalate' | 'tag';
  config: Record<string, unknown>; next_step_id: string | null; condition?: string;
}
export interface ChannelIntegration {
  id: UUID; channel_type: ChannelType; name: string; description: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending'; config: ChannelConfig;
  stats: { total_conversations: number; active_conversations: number; messages_today: number; avg_response_time: string; };
  last_synced_at: string | null; created_at: string;
}
export type SimulatorScenario = {
  id: string; title: string; description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  persona: CustomerPersona; initial_message: string;
  tags: string[]; learning_objectives: string[];
};
export type CustomerPersona = {
  name: string; mood: 'frustrated' | 'confused' | 'angry' | 'polite' | 'demanding';
  backstory: string; pain_points: string[];
};
export type SimulatorMessage = {
  id: string; role: 'agent' | 'customer'; content: string;
  timestamp: string; feedback?: AgentFeedback;
};
export type AgentFeedback = {
  score: number; strengths: string[]; improvements: string[];
  tone_match: number; empathy_score: number; clarity_score: number;
  resolution_effectiveness: number;
};
export interface AnalyticsData {
  overview: { total_conversations: number; avg_response_time: string; csat_score: number; resolution_rate: number; open_tickets: number; resolved_today: number; };
  channel_distribution: { channel: ChannelType; count: number; percentage: number }[];
  agent_performance: { agent: User; conversations_handled: number; avg_response_time: string; csat_score: number; resolution_rate: number; }[];
  intent_distribution: { intent: IntentCategory; count: number; percentage: number }[];
  sentiment_trend: { date: string; avg_sentiment: number; total: number }[];
  hourly_volume: { hour: number; count: number }[];
}

export type ActiveView = 'dashboard' | 'inbox' | 'tickets' | 'copilot' | 'simulator' | 'channels' | 'ai_training' | 'settings' | 'analytics' | 'team';

export interface FilterState {
  status: ConversationStatus | 'all'; channel: ChannelType | 'all';
  priority: Priority | 'all'; assigned: 'me' | 'unassigned' | 'all'; search: string;
}
