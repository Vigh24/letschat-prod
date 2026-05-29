import { Router } from 'express';
import { supabase } from '../supabase';
import twilio from 'twilio';

const router = Router();

router.get('/api/voice/token', async (req, res) => {
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    const twilioSettings = org?.settings?.twilio_calling || {};

    const accountSid = twilioSettings.account_sid || process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = twilioSettings.api_key_sid || process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = twilioSettings.api_key_secret || process.env.TWILIO_API_KEY_SECRET;
    const twimlAppSid = twilioSettings.twiml_app_sid || process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return res.status(400).json({ error: 'Twilio calling settings are not configured.' });
    }

    const identity = 'agent-' + (req.query.identity || 'default');

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const accessToken = new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });
    accessToken.addGrant(voiceGrant);

    res.json({ token: accessToken.toJwt() });
  } catch (err: any) {
    console.error('Failed to generate Twilio Voice Token:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/voice/handle', async (req, res) => {
  const To = req.body.To || req.query.To;
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    const twilioSettings = org?.settings?.twilio_calling || {};
    const callerId = twilioSettings.caller_id || process.env.TWILIO_CALLER_ID;

    if (!callerId) {
      console.error('Missing Twilio Caller ID configuration');
      response.say('Error: Twilio caller ID configuration is missing.');
      res.type('text/xml');
      return res.send(response.toString());
    }

    if (To) {
      const dial = response.dial({ callerId });
      if (String(To).startsWith('client:')) {
        dial.client(String(To).replace('client:', ''));
      } else {
        dial.number(To);
      }
    } else {
      response.say('Welcome to Lets Chat Calling. No destination number was provided.');
    }

    res.type('text/xml');
    res.send(response.toString());
  } catch (err: any) {
    console.error('TwiML webhook handling failed:', err);
    response.say('Internal server error during call routing.');
    res.type('text/xml');
    res.send(response.toString());
  }
});

export default router;
