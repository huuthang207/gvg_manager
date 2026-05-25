import React from 'react';
import type { AppStateResponse } from '../../services/apiTypes.ts';
import { getDiscordGuildIconUrl } from '../../shared/utils/discordCdn.ts';

const DEFAULT_DOCUMENT_TITLE = 'GvG Manager';
const DYNAMIC_GUILD_ICON_SELECTOR = 'link[rel="icon"][data-dynamic-guild-icon="true"]';

export function useGuildDocumentMetadata(currentGuild: AppStateResponse['guild'] | null) {
  React.useEffect(() => {
    document.title = currentGuild?.name || DEFAULT_DOCUMENT_TITLE;

    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [currentGuild?.name]);

  React.useEffect(() => {
    const existingIcon = document.querySelector<HTMLLinkElement>(DYNAMIC_GUILD_ICON_SELECTOR);
    const iconUrl = currentGuild
      ? getDiscordGuildIconUrl(currentGuild.discordGuildId, currentGuild.icon, 96)
      : null;

    if (!iconUrl) {
      existingIcon?.remove();
      return;
    }

    const icon = existingIcon ?? document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.href = iconUrl;
    icon.dataset.dynamicGuildIcon = 'true';

    if (!existingIcon) {
      document.head.appendChild(icon);
    }

    return () => {
      document.querySelector<HTMLLinkElement>(DYNAMIC_GUILD_ICON_SELECTOR)?.remove();
    };
  }, [currentGuild?.discordGuildId, currentGuild?.icon]);
}
