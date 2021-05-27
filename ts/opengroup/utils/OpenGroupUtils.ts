import { default as insecureNodeFetch } from 'node-fetch';
import { OpenGroupV2Room } from '../../data/opengroups';
import { sendViaOnion } from '../../session/onions/onionSend';
import { toHex } from '../../session/utils/String';
import { OpenGroupRequestCommonType } from '../opengroupV2/ApiUtil';

const protocolRegex = new RegExp('(https?://)?');

const dot = '\\.';
const qMark = '\\?';
const hostnameRegex = new RegExp(
  `(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])${dot})*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])`
);
const portRegex = '(:[0-9]+)?';

// roomIds allows between 2 and 64 of '0-9' or 'a-z' or '_' chars
export const roomIdV2Regex = '[0-9a-z_]{2,64}';
export const publicKeyRegex = '[0-9a-z]{64}';
export const publicKeyParam = 'public_key=';
export const openGroupV2ServerUrlRegex = new RegExp(
  `${protocolRegex.source}${hostnameRegex.source}${portRegex}`
);

/**
 * Regex to use to check if a string is a v2open completeURL with pubkey.
 * Be aware that the /g flag is not set as .test() will otherwise return alternating result
 *
 * see https://stackoverflow.com/a/9275499/1680951
 */
export const openGroupV2CompleteURLRegex = new RegExp(
  `${openGroupV2ServerUrlRegex.source}\/${roomIdV2Regex}${qMark}${publicKeyParam}${publicKeyRegex}`,
  'm'
);

/**
 * Just a constant to have less `publicChat:` everywhere.
 * This is the prefix used to identify our open groups in the conversation database (v1 or v2)
 * Note: It does already have the ':' included
 */
export const openGroupPrefix = 'publicChat:';

/**
 * Just a regex to match a public chat (i.e. a string starting with publicChat:)
 */
export const openGroupPrefixRegex = new RegExp(`^${openGroupPrefix}`);

export const openGroupV2ConversationIdRegex = new RegExp(
  `${openGroupPrefix}${roomIdV2Regex}@${protocolRegex.source}${hostnameRegex.source}${portRegex}`
);

/**
 * This function returns a full url on an open group v2 room used for sync messages for instance.
 * This is basically what the QRcode encodes
 *
 */
export function getCompleteUrlFromRoom(roomInfos: OpenGroupV2Room) {
  // serverUrl has the port and protocol already
  return `${roomInfos.serverUrl}/${roomInfos.roomId}?${publicKeyParam}${roomInfos.serverPublicKey}`;
}

/**
 * Prefix server with https:// if it's not already prefixed with http or https.
 */
export function prefixify(server: string, hasSSL: boolean = true): string {
  const hasPrefix = server.match('^https?://');
  if (hasPrefix) {
    return server;
  }

  return `http${hasSSL ? 's' : ''}://${server}`;
}

/**
 * No sql access. Just how our open groupv2 url looks like.
 * ServerUrl can have the protocol and port included, or not
 * @returns `${openGroupPrefix}${roomId}@${serverUrl}`
 */
export function getOpenGroupV2ConversationId(serverUrl: string, roomId: string) {
  if (!roomId.match(roomIdV2Regex)) {
    throw new Error('getOpenGroupV2ConversationId: Invalid roomId');
  }
  if (!serverUrl.match(openGroupV2ServerUrlRegex)) {
    throw new Error('getOpenGroupV2ConversationId: Invalid serverUrl');
  }
  return `${openGroupPrefix}${roomId}@${serverUrl}`;
}

/**
 * No sql access. Just plain string logic
 */
export function getOpenGroupV2FromConversationId(
  conversationId: string
): OpenGroupRequestCommonType {
  if (isOpenGroupV2(conversationId)) {
    const atIndex = conversationId.indexOf('@');
    const roomId = conversationId.slice(openGroupPrefix.length, atIndex);
    const serverUrl = conversationId.slice(atIndex + 1);
    return {
      serverUrl,
      roomId,
    };
  }
  throw new Error('Not a v2 open group convo id');
}

/**
 * Check if this conversation id corresponds to an OpenGroupV2 conversation.
 * No access to database are made. Only regex matches
 * @param conversationId the convo id to evaluate
 * @returns true if this conversation id matches the Opengroupv2 conversation id regex
 */
export function isOpenGroupV2(conversationId: string) {
  return openGroupV2ConversationIdRegex.test(conversationId);
}
