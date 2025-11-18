import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/lib/constants';
import { SensorData } from './bleService';

// Define types for our database tables
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthenticationMethod {
  id: string;
  user_id: string;
  method_type: 'face' | 'voice' | 'gesture' | 'pin';
  is_enrolled: boolean;
  enrolled_at?: string;
  created_at: string;
}

export interface AuthenticationLog {
  id: string;
  user_id: string;
  method_type: string;
  success: boolean;
  confidence_score?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Pin {
  id?: string;
  user_id: string;
  pin_hash: string;
  created_at?: string;
  updated_at?: string;
}

export interface SensorReading {
  id?: string;
  user_id: string;
  temperature: number;
  humidity: number;
  air_quality: number;
  light: number;
  acceleration_x: number;
  acceleration_y: number;
  acceleration_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  is_fall_detected: boolean;
  recorded_at: string;
}

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      SUPABASE_CONFIG.URL,
      SUPABASE_CONFIG.ANON_KEY
    );
  }

  // Authentication methods
  async signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.client.auth.signOut();
  }

  async getCurrentUser() {
    const { data: { session } } = await this.client.auth.getSession();
    return session?.user || null;
  }

  // Profile methods
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }

    return data;
  }

  // Authentication methods
  async getAuthenticationMethods(userId: string): Promise<AuthenticationMethod[]> {
    const { data, error } = await this.client
      .from('authentication_methods')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching auth methods:', error);
      return [];
    }

    return data || [];
  }

  async enrollAuthenticationMethod(
    userId: string,
    methodType: AuthenticationMethod['method_type']
  ): Promise<AuthenticationMethod | null> {
    const { data, error } = await this.client
      .from('authentication_methods')
      .upsert({
        user_id: userId,
        method_type: methodType,
        is_enrolled: true,
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error enrolling auth method:', error);
      return null;
    }

    return data;
  }

  // Authentication logs
  async logAuthentication(
    userId: string,
    methodType: string,
    success: boolean,
    confidenceScore?: number,
    metadata?: Record<string, any>
  ): Promise<AuthenticationLog | null> {
    const { data, error } = await this.client
      .from('authentication_logs')
      .insert({
        user_id: userId,
        method_type: methodType,
        success,
        confidence_score: confidenceScore,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging auth:', error);
      return null;
    }

    return data;
  }

  async getAuthenticationLogs(userId: string): Promise<AuthenticationLog[]> {
    const { data, error } = await this.client
      .from('authentication_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching auth logs:', error);
      return [];
    }

    return data || [];
  }

  // PIN methods
  async setPin(userId: string, pinHash: string): Promise<Pin | null> {
    const { data, error } = await this.client
      .from('pins')
      .upsert({
        user_id: userId,
        pin_hash: pinHash
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error setting PIN:', error);
      return null;
    }

    return data;
  }

  async getPin(userId: string): Promise<Pick<Pin, 'pin_hash'> | null> {
    const { data, error } = await this.client
      .from('pins')
      .select('pin_hash')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching PIN:', error);
      return null;
    }

    return data;
  }

  // Sensor data methods
  async saveSensorReading(userId: string, sensorData: SensorData): Promise<SensorReading | null> {
    const { data, error } = await this.client
      .from('sensor_readings')
      .insert({
        user_id: userId,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        air_quality: sensorData.airQuality,
        light: sensorData.light,
        acceleration_x: sensorData.imu.ax,
        acceleration_y: sensorData.imu.ay,
        acceleration_z: sensorData.imu.az,
        gyro_x: sensorData.imu.gx,
        gyro_y: sensorData.imu.gy,
        gyro_z: sensorData.imu.gz,
        is_fall_detected: this.detectFallFromData(sensorData),
        recorded_at: sensorData.timestamp.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving sensor reading:', error);
      return null;
    }

    return data;
  }

  async getSensorReadings(userId: string, limit: number = 100): Promise<SensorReading[]> {
    const { data, error } = await this.client
      .from('sensor_readings')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sensor readings:', error);
      return [];
    }

    return data || [];
  }

  async getRecentFallDetections(userId: string, hours: number = 24): Promise<SensorReading[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await this.client
      .from('sensor_readings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_fall_detected', true)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error fetching fall detections:', error);
      return [];
    }

    return data || [];
  }

  // Helper method to detect falls from sensor data
  private detectFallFromData(sensorData: SensorData): boolean {
    // Simple fall detection algorithm based on acceleration magnitude
    const { ax, ay, az } = sensorData.imu;
    const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    
    // If acceleration magnitude drops significantly, it might indicate a fall
    return magnitude < 1.0;
  }

  // Real-time subscriptions
  subscribeToSensorReadings(userId: string, callback: (payload: any) => void) {
    return this.client
      .channel('sensor-readings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  subscribeToAuthenticationLogs(userId: string, callback: (payload: any) => void) {
    return this.client
      .channel('auth-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'authentication_logs',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }
}

export const supabaseService = new SupabaseService();