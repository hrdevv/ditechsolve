/**
 * WordPress Settings Hook
 * 
 * Manages WordPress/WooCommerce connection settings with localStorage persistence
 * and provides access to configured API client.
 * 
 * USAGE:
 * 
 * ```tsx
 * const { settings, saveSettings, isConfigured, testConnection } = useWordPressSettings();
 * 
 * // Save settings
 * await saveSettings({
 *   siteUrl: 'https://yoursite.com',
 *   consumerKey: 'ck_xxx',
 *   consumerSecret: 'cs_xxx'
 * });
 * 
 * // Test connection
 * const result = await testConnection();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { wordpressAPI, WordPressConfig } from '@/lib/wordpress-api';

const STORAGE_KEY = 'wordpress_settings';

interface UseWordPressSettingsReturn {
  settings: WordPressConfig | null;
  saveSettings: (config: WordPressConfig) => Promise<void>;
  clearSettings: () => void;
  isConfigured: boolean;
  testConnection: () => Promise<{ success: boolean; message: string; version?: string }>;
  api: typeof wordpressAPI;
}

export function useWordPressSettings(): UseWordPressSettingsReturn {
  const [settings, setSettings] = useState<WordPressConfig | null>(null);

  /**
   * Load settings from localStorage on mount
   */
  useEffect(() => {
    const loadSettings = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const config = JSON.parse(stored) as WordPressConfig;
          setSettings(config);
          wordpressAPI.configure(config);
        }
      } catch (error) {
        console.error('Failed to load WordPress settings:', error);
      }
    };

    loadSettings();
  }, []);

  /**
   * Save settings to localStorage and configure API
   */
  const saveSettings = useCallback(async (config: WordPressConfig) => {
    try {
      // Validate configuration
      if (!config.siteUrl || !config.consumerKey || !config.consumerSecret) {
        throw new Error('All fields are required');
      }

      // Clean up site URL
      config.siteUrl = config.siteUrl.trim().replace(/\/$/, '');

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      
      // Update state
      setSettings(config);
      
      // Configure API
      wordpressAPI.configure(config);
    } catch (error) {
      console.error('Failed to save WordPress settings:', error);
      throw error;
    }
  }, []);

  /**
   * Clear settings from localStorage
   */
  const clearSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(null);
  }, []);

  /**
   * Test connection to WordPress/WooCommerce
   */
  const testConnection = useCallback(async () => {
    if (!wordpressAPI.isConfigured()) {
      return {
        success: false,
        message: 'WordPress API is not configured. Please enter your credentials.',
      };
    }

    try {
      return await wordpressAPI.testConnection();
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, []);

  return {
    settings,
    saveSettings,
    clearSettings,
    isConfigured: settings !== null && wordpressAPI.isConfigured(),
    testConnection,
    api: wordpressAPI,
  };
}
