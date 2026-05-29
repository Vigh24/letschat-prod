import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';

export interface OrgRequest extends Request {
  orgId?: string;
  channelId?: string;
}

export async function resolveOrgFromPhoneNumberId(
  req: OrgRequest,
  res: Response,
  next: NextFunction
) {
  const body = req.body;
  const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

  if (!phoneNumberId) {
    return res.status(400).json({ error: 'Missing phone_number_id in webhook payload' });
  }

  try {
    const { data: channel, error } = await supabase
      .from('channels')
      .select('id, organization_id')
      .eq('config->>phone_number_id', String(phoneNumberId))
      .eq('is_active', true)
      .maybeSingle();

    if (error || !channel) {
      console.error(`No active channel found for phone_number_id: ${phoneNumberId}`);
      return res.status(404).json({ error: 'No active channel found for this phone number' });
    }

    req.orgId = channel.organization_id;
    req.channelId = channel.id;
    next();
  } catch (err: any) {
    console.error('Error resolving org from phone_number_id:', err.message);
    return res.status(500).json({ error: 'Failed to resolve organization' });
  }
}
