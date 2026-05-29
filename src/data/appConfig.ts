// ============================================================
// Lets Chat — App Configuration
// Static configuration for the current agent and organization.
// Replace with auth-based user data when authentication is added.
// ============================================================

import type { UserRole } from '@/types';

export const currentAgent: {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_online: boolean;
  avatar_url: string | null;
  team: string;
} = {
  id: '00000000-0000-0000-0000-000000000003',
  full_name: 'Priya Sharma',
  email: 'priya.sharma@letschat.com',
  role: 'admin',
  is_online: true,
  avatar_url: null,
  team: 'Support',
};

export const appOrg = {
  name: 'Lets Chat Support',
  slug: 'letschat',
  plan: 'pro' as const,
};
