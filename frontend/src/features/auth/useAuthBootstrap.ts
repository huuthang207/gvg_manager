import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { checkAuthStatus, DiscordUser } from '../../services/discordApi.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';

interface AppStateAccess {
  guild: unknown | null;
  permissions?: string[];
}

interface UseAuthBootstrapParams {
  loadAppState: () => Promise<AppStateAccess>;
  setAuthLoading: Dispatch<SetStateAction<boolean>>;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  setIsAuthorized: Dispatch<SetStateAction<boolean>>;
  setBlockedReason: Dispatch<SetStateAction<string | null>>;
  setCurrentUser: Dispatch<SetStateAction<DiscordUser | null>>;
}

const lostAccessMessage = 'Bạn không còn quyền truy cập server bang.';

function hasGuildAccess(state: AppStateAccess) {
  return !!state.guild && (state.permissions ?? []).includes('view:guild');
}

export function useAuthBootstrap(params: UseAuthBootstrapParams) {
  const { alert } = useSystemDialog();
  const { loadAppState, setAuthLoading, setIsAuthenticated, setIsAuthorized, setBlockedReason, setCurrentUser } = params;

  useEffect(() => {
    setAuthLoading(true);
    checkAuthStatus().then(async status => {
      setIsAuthenticated(status.authenticated);
      setCurrentUser(status.user || null);
      const authorized = status.authorized ?? true;
      setIsAuthorized(status.authenticated && authorized);
      setBlockedReason(status.blockedReason || null);
      if (status.authenticated && authorized) {
        const state = await loadAppState();
        const canViewGuild = hasGuildAccess(state);
        setIsAuthorized(canViewGuild);
        setBlockedReason(canViewGuild ? null : lostAccessMessage);
      }
    }).catch(() => {
      setIsAuthenticated(false);
      setIsAuthorized(false);
      setBlockedReason(null);
      setCurrentUser(null);
    }).finally(() => {
      setAuthLoading(false);
    });
  }, [loadAppState, setAuthLoading, setBlockedReason, setCurrentUser, setIsAuthenticated, setIsAuthorized]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      checkAuthStatus().then(async status => {
        setIsAuthenticated(status.authenticated);
        setCurrentUser(status.user || null);
        const authorized = status.authorized ?? true;
        setIsAuthorized(status.authenticated && authorized);
        setBlockedReason(status.blockedReason || null);
        if (status.authenticated && authorized) {
          await loadAppState();
        }
      });
    }
    if (params.get('oauth_error')) {
      const error = params.get('oauth_error');
      window.history.replaceState({}, '', window.location.pathname);
      void alert({ message: `Discord OAuth lỗi: ${error}`, variant: 'error' });
    }
  }, [alert, loadAppState, setBlockedReason, setCurrentUser, setIsAuthenticated, setIsAuthorized]);
}
