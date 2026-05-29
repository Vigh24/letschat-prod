import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

const ORG_ID = '00000000-0000-0000-0000-000000000001';

router.get('/api/tags', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('name');
    if (error) throw error;
    res.json({ tags: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/tags', async (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Tag name is required' });
  try {
    const { data, error } = await supabase
      .from('tags')
      .insert({
        organization_id: ORG_ID,
        name: name.trim(),
        color: color || '#6366f1'
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ tag: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/tags/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
