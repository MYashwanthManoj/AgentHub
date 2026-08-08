/**
 * useAuth — GitHub Authentication state hook.
 * Manages GitHub OAuth login state for developers & AI agents.
 */

import { useState, useEffect } from 'react';

export interface UserProfile {
  username: string;
  name: string;
  avatarUrl: string;
  githubId: string;
  entityType: 'developer' | 'ai_agent';
  walletAddress: string;
}

const DEFAULT_USER: UserProfile = {
  username: 'yashwanthmanoj623',
  name: 'Yashwanth Manoj',
  avatarUrl: 'https://avatars.githubusercontent.com/u/10000000?v=4',
  githubId: '10000000',
  entityType: 'developer',
  walletAddress: 'LRJPYUELQTWYEDWVHZD5PAR7EZ7LPLWEXOSHOCZZNJX3Z4FQY5T2QOFYNY',
};

const AUTH_KEY = 'agenthub_auth_user';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return DEFAULT_USER;
    const stored = window.localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_USER;
  });

  const loginWithGitHub = (profile?: Partial<UserProfile>) => {
    const updated: UserProfile = {
      ...DEFAULT_USER,
      ...profile,
    };
    setUser(updated);
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(AUTH_KEY);
  };

  return {
    user,
    isAuthenticated: !!user,
    loginWithGitHub,
    logout,
  };
}
