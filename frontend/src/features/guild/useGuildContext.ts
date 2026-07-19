import { useCallback, useState } from 'react';
import { getAccessibleGuilds, setActiveGuild } from '../../services/discordApi.ts';
import { getErrorMessage } from '../../lib/error.ts';
import { useSystemDialog } from '../app/SystemDialogProvider.tsx';

export function useGuildContext(applyAppState: (state: Awaited<ReturnType<typeof setActiveGuild>>) => Promise<void>) {
  const { alert } = useSystemDialog();
  const [accessibleGuilds, setAccessibleGuilds] = useState([]);
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
      await applyAppState(await setActiveGuild(guildId));
      await loadAccessibleGuilds();
    } catch (err) {
      void alert({ message: getErrorMessage(err, 'Không thể chuyển server'), variant: 'error' });
    } finally {
      setSwitchingGuild(false);
    }
  }, [alert, applyAppState, loadAccessibleGuilds]);

  return { accessibleGuilds, switchingGuild, setAccessibleGuilds, loadAccessibleGuilds, handleGuildSwitch };
}
