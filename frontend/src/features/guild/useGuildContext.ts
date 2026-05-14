import { useCallback, useState } from 'react';
import { AccessibleGuild, getAccessibleGuilds, setActiveGuild } from '../../services/discordApi.ts';
import { getErrorMessage } from '../../lib/error.ts';

export function useGuildContext(applyAppState: (state: Awaited<ReturnType<typeof setActiveGuild>>) => Promise<void>, resetSnapshots: () => void) {
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
      resetSnapshots();
      await loadAccessibleGuilds();
    } catch (err) {
      alert(getErrorMessage(err, 'Không thể chuyển server'));
    } finally {
      setSwitchingGuild(false);
    }
  }, [applyAppState, loadAccessibleGuilds, resetSnapshots]);

  return {
    accessibleGuilds,
    switchingGuild,
    setAccessibleGuilds,
    loadAccessibleGuilds,
    handleGuildSwitch,
  };
}
