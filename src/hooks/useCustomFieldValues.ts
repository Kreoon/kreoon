import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomFieldValue {
  id: string;
  content_id: string;
  field_id: string;
  value: any;
}

export function useCustomFieldValues(contentId: string | null) {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});

  const fetchValues = useCallback(async () => {
    if (!contentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_custom_field_values')
        .select('*')
        .eq('content_id', contentId);

      if (error) throw error;

      const valuesMap: Record<string, any> = {};
      (data || []).forEach(v => {
        valuesMap[v.field_id] = v.value;
      });
      setValues(valuesMap);
    } catch (error) {
      console.error('Error fetching custom field values:', error);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const setValue = useCallback(async (fieldId: string, value: any) => {
    if (!contentId) return;

    try {
      const { error } = await supabase
        .from('content_custom_field_values')
        .upsert({
          content_id: contentId,
          field_id: fieldId,
          value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'content_id,field_id'
        });

      if (error) throw error;

      setValues(prev => ({ ...prev, [fieldId]: value }));
    } catch (error) {
      console.error('Error setting custom field value:', error);
      throw error;
    }
  }, [contentId]);

  const deleteValue = useCallback(async (fieldId: string) => {
    if (!contentId) return;

    try {
      const { error } = await supabase
        .from('content_custom_field_values')
        .delete()
        .eq('content_id', contentId)
        .eq('field_id', fieldId);

      if (error) throw error;

      setValues(prev => {
        const newValues = { ...prev };
        delete newValues[fieldId];
        return newValues;
      });
    } catch (error) {
      console.error('Error deleting custom field value:', error);
      throw error;
    }
  }, [contentId]);

  return {
    loading,
    values,
    setValue,
    deleteValue,
    refetch: fetchValues
  };
}
