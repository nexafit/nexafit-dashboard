export type UserRole = 'user' | 'member' | 'owner';

export type AppUser = {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  role?: UserRole | string;
  is_premium?: boolean;
  free_tokens?: number;
  rewarded_tokens?: number;
  total_scans?: number;
  adblock_detected?: boolean;
  premium_source?: string;
  premium_product_id?: string;
  created_at?: unknown;
  createdAt?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
  last_login_at?: unknown;
  lastLoginAt?: unknown;
};

export type AppConfig = {
  interstitial_ad_unit_id: string;
  rewarded_ad_unit_id: string;
  welcome_free_tokens: number;
  random_interstitial_probability: number;
  scan_save_interstitial_probability: number;
  fullscreen_ads_enabled: boolean;
  kill_switch: boolean;
  openrouter_model: string;
};

export type DailyStat = {
  id: string;
  total_scans: number;
  adblock_users_detected: number;
};

export type ScanLog = {
  id: string;
  uid?: string;
  provider?: string;
  status?: string;
  created_at?: unknown;
  createdAt?: unknown;
};

export type ToastMessage = {
  type: 'success' | 'error' | 'info';
  text: string;
};
