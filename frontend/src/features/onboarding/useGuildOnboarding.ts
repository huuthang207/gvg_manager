import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppStateResponse,
  completeGuildOnboarding,
  connectGuild,
  getAvailableGuilds,
  getGuildOnboardingState,
  GuildOnboardingStateResponse,
  OnboardingAvailableGuild,
} from '../../services/discordApi.ts';
import { getErrorMessage } from '../../lib/error.ts';

type ConnectResult =
  | { type: 'connected'; state: AppStateResponse }
  | { type: 'bot_required'; guild: OnboardingAvailableGuild; inviteUrl: string | null };

interface UseGuildOnboardingParams {
  currentGuild: AppStateResponse['guild'] | null;
  applyAppState: (state: AppStateResponse) => Promise<void>;
  loadAccessibleGuilds: () => Promise<void>;
  loadAppState: () => Promise<AppStateResponse>;
  onConnected?: (state: AppStateResponse) => void;
}

export function useGuildOnboarding({ currentGuild, applyAppState, loadAccessibleGuilds, loadAppState, onConnected }: UseGuildOnboardingParams) {
  const [availableGuilds, setAvailableGuilds] = useState<OnboardingAvailableGuild[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botRequired, setBotRequired] = useState<{ guild: OnboardingAvailableGuild; inviteUrl: string | null } | null>(null);
  const [onboardingState, setOnboardingState] = useState<GuildOnboardingStateResponse | null>(null);
  const [onboardingStateLoading, setOnboardingStateLoading] = useState(false);

  const manageableGuilds = useMemo(() => availableGuilds.filter(guild => guild.canManageGuild), [availableGuilds]);
  const connectedGuilds = useMemo(() => availableGuilds.filter(guild => guild.isConnected), [availableGuilds]);

  const loadAvailableGuilds = useCallback(async () => {
    setAvailableLoading(true);
    setError(null);
    try {
      const data = await getAvailableGuilds();
      setAvailableGuilds(data.guilds ?? []);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách server Discord.'));
      setAvailableGuilds([]);
    } finally {
      setAvailableLoading(false);
    }
  }, []);

  const loadOnboardingState = useCallback(async (guildId: string) => {
    setOnboardingStateLoading(true);
    setError(null);
    try {
      const state = await getGuildOnboardingState(guildId);
      setOnboardingState(state);
      return state;
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải trạng thái onboarding.'));
      setOnboardingState(null);
      return null;
    } finally {
      setOnboardingStateLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailableGuilds();
  }, [loadAvailableGuilds]);

  useEffect(() => {
    if (!currentGuild || currentGuild.onboardingCompletedAt) {
      setOnboardingState(null);
      return;
    }
    void loadOnboardingState(currentGuild.id);
  }, [currentGuild, loadOnboardingState]);

  const connect = useCallback(async (guild: OnboardingAvailableGuild): Promise<ConnectResult | null> => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await connectGuild(guild.discordGuildId);
      if (result.status === 'BOT_REQUIRED') {
        const botState = { guild, inviteUrl: result.inviteUrl };
        setBotRequired(botState);
        return { type: 'bot_required', ...botState };
      }

      await applyAppState(result.appState);
      onConnected?.(result.appState);
      await loadAccessibleGuilds();
      setBotRequired(null);
      if (!result.appState.guild?.onboardingCompletedAt && result.appState.guild?.id) {
        await loadOnboardingState(result.appState.guild.id);
      }
      return { type: 'connected', state: result.appState };
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể kết nối server.'));
      return null;
    } finally {
      setActionLoading(false);
    }
  }, [applyAppState, loadAccessibleGuilds, loadOnboardingState, onConnected]);

  const retryBotRequiredGuild = useCallback(async () => {
    if (!botRequired) return null;
    return connect(botRequired.guild);
  }, [botRequired, connect]);

  const complete = useCallback(async () => {
    if (!currentGuild) return false;
    setActionLoading(true);
    setError(null);
    try {
      await completeGuildOnboarding(currentGuild.id);
      const state = await loadAppState();
      await applyAppState(state);
      await loadAccessibleGuilds();
      setOnboardingState(null);
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể hoàn tất onboarding.'));
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [applyAppState, currentGuild, loadAccessibleGuilds, loadAppState]);

  return {
    availableGuilds,
    manageableGuilds,
    connectedGuilds,
    availableLoading,
    actionLoading,
    error,
    botRequired,
    onboardingState,
    onboardingStateLoading,
    loadAvailableGuilds,
    loadOnboardingState,
    connect,
    retryBotRequiredGuild,
    complete,
    clearBotRequired: () => setBotRequired(null),
  };
}
