import { channelData } from '../youtube/getData.js';
import { addChannel, channelExists, getChannel } from '../db/sqlLibrary.js';
import { gatherChannelDataForArchival } from '../utilities/tools.js';

export async function ensureChannelArchiveInfo(channelId, source, database) {
  const channelExistence = await channelExists(channelId, source, database);

  if (channelExistence.exists) {
    const channelDbData = await getChannel(channelId, source, database);

    return {
      channelobjid: channelDbData.objid,
      apiChannelId: channelDbData.channel_id,
      chanName: channelDbData.owner_name,
      fromDb: true,
    };
  }

  const channelApiData = await channelData(channelId);
  const channelItem = channelApiData?.items?.[0];

  if (!channelItem) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const apiChannelData = gatherChannelDataForArchival(channelItem);
  const channelAdded = await addChannel(apiChannelData, source, database);

  return {
    channelobjid: channelAdded.insertId,
    apiChannelId: channelItem.id,
    chanName: channelItem.snippet.title,
    fromDb: false,
    apiChannelData,
  };
}
