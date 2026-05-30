import type { AppConfig } from '../types';

export const defaultConfig: AppConfig = {
  interstitial_ad_unit_id: 'ca-app-pub-3940256099942544/1033173712',
  rewarded_ad_unit_id: 'ca-app-pub-3940256099942544/5224354917',
  welcome_free_tokens: 2,
  random_interstitial_probability: 0.15,
  scan_save_interstitial_probability: 1.0,
  fullscreen_ads_enabled: true,
  kill_switch: false,
  openrouter_model: 'openrouter/free'
};
