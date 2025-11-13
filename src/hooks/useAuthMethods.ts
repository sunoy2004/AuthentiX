import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AuthMethod = 'face' | 'voice' | 'gesture' | 'pin';

export interface AuthMethodStatus {
  method_type: AuthMethod;
  is_enrolled: boolean;
  enrolled_at: string | null;
}

export const useAuthMethods = (userId: string | undefined) => {
  const [methods, setMethods] = useState<AuthMethodStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMethods = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('authentication_methods')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Ensure all methods exist
      const allMethods: AuthMethod[] = ['face', 'voice', 'gesture', 'pin'];
      const existingMethods = data || [];
      
      const methodsMap = new Map(existingMethods.map(m => [m.method_type, m]));
      
      const completeMethodsList: AuthMethodStatus[] = allMethods.map(method => {
        const existing = methodsMap.get(method);
        return existing ? {
          method_type: existing.method_type as AuthMethod,
          is_enrolled: existing.is_enrolled,
          enrolled_at: existing.enrolled_at,
        } : {
          method_type: method,
          is_enrolled: false,
          enrolled_at: null,
        };
      });

      setMethods(completeMethodsList);
    } catch (error: any) {
      toast.error('Failed to fetch authentication methods');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, [userId]);

  const updateMethodStatus = async (method: AuthMethod, isEnrolled: boolean) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('authentication_methods')
        .upsert({
          user_id: userId,
          method_type: method,
          is_enrolled: isEnrolled,
          enrolled_at: isEnrolled ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,method_type',
        });

      if (error) throw error;

      await fetchMethods();
      toast.success(`${method} authentication ${isEnrolled ? 'enrolled' : 'updated'} successfully`);
    } catch (error: any) {
      toast.error(`Failed to update ${method} authentication`);
      console.error(error);
    }
  };

  const logAuthAttempt = async (
    method: AuthMethod,
    success: boolean,
    confidenceScore?: number,
    metadata?: any
  ) => {
    if (!userId) return;

    try {
      // Log to auth_logs table with correct schema
      const { error } = await supabase.from('auth_logs').insert({
        user_id: userId,
        auth_type: method,
        status: success ? 'success' : 'failure',
        confidence_score: confidenceScore,
        metadata: metadata || {},
      });

      if (error) {
        console.error('Failed to log to auth_logs:', error);
      }

      // Also log to authentication_logs for backward compatibility
      await supabase.from('authentication_logs').insert({
        user_id: userId,
        method_type: method,
        success,
        confidence_score: confidenceScore,
        metadata,
      });
    } catch (error) {
      console.error('Failed to log authentication attempt:', error);
    }
  };

  const isMethodEnrolled = (method: AuthMethod): boolean => {
    return methods.find(m => m.method_type === method)?.is_enrolled || false;
  };

  const enrolledCount = methods.filter(m => m.is_enrolled).length;

  return {
    methods,
    loading,
    updateMethodStatus,
    logAuthAttempt,
    isMethodEnrolled,
    enrolledCount,
    refetch: fetchMethods,
  };
};
