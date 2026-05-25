import React from 'react';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import { getGvgParticipationStats } from '../../services/discordApi.ts';

const getCurrentMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

interface UseGvgParticipationStatsParams {
  currentGuild: AppStateResponse['guild'] | null;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  permissions: string[];
}

export function useGvgParticipationStats({
  currentGuild,
  isAuthenticated,
  isAuthorized,
  permissions,
}: UseGvgParticipationStatsParams) {
  const [gvgParticipationMonth, setGvgParticipationMonth] = React.useState(getCurrentMonthKey);
  const [gvgParticipationStats, setGvgParticipationStats] = React.useState<Record<string, number>>({});

  const refreshGvgParticipationStats = React.useCallback(async () => {
    if (!currentGuild || !permissions.includes('view:guild')) {
      setGvgParticipationStats({});
      return;
    }

    try {
      const response = await getGvgParticipationStats(gvgParticipationMonth);
      setGvgParticipationStats(response.stats);
    } catch {
      setGvgParticipationStats({});
    }
  }, [currentGuild, gvgParticipationMonth, permissions]);

  React.useEffect(() => {
    if (!isAuthenticated || !isAuthorized || !currentGuild || !permissions.includes('view:guild')) {
      setGvgParticipationStats({});
      return;
    }

    void refreshGvgParticipationStats();
  }, [currentGuild, isAuthenticated, isAuthorized, permissions, refreshGvgParticipationStats]);

  return {
    gvgParticipationMonth,
    setGvgParticipationMonth,
    gvgParticipationStats,
    setGvgParticipationStats,
    refreshGvgParticipationStats,
  };
}
