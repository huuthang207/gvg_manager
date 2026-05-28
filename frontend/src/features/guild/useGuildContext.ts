import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AccessibleGuild, getAccessibleGuilds, setActiveGuild } from '../../services/discordApi.ts';
import { getErrorMessage } from '../../lib/error.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';

export function useGuildContext(
  applyAppState: (state: Awaited<ReturnType<typeof setActiveGuild>>) => Promise<void>,
  resetSnapshots: () => void,
  setActiveGuildId?: Dispatch<SetStateAction<string | null>>,
) {
  const { alert } = useSystemDialog();
  const [accessibleGuilds, setAccessibleGuilds] = useState<AccessibleGuild[]>([]);
  const [switchingGuild, setSwitchingGuild] = useState(false);

  const loadAccessibleGuilds = useCallback(async () => {
    try {
      const data = await getAccessibleGuilds();
      setAccessibleGuilds(data.guilds || []);
    } catch {
      setAccessibleGuilds([]);
    }
  }, []);

  const handleGuildSwitch = useCallback(async (guildId: string) => {
    setSwitchingGuild(true);
    try {
      const state = await setActiveGuild(guildId);
      await applyAppState(state);
      setActiveGuildId?.(state.guild?.id ?? guildId);
      resetSnapshots();
      await loadAccessibleGuilds();
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể chuyển server'), variant: 'error' });
    } finally {
      setSwitchingGuild(false);
    }
  }, [alert, applyAppState, loadAccessibleGuilds, resetSnapshots, setActiveGuildId]);

  return {
    accessibleGuilds,
    switchingGuild,
    setAccessibleGuilds,
    loadAccessibleGuilds,
    handleGuildSwitch,
  };
}
