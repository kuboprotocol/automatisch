import { microsoftAuth } from '../../helpers/microsoft-graph.js';

// Escopos delegados que não pedem consentimento de administrador.
export const TEAMS_SCOPES = ['Team.ReadBasic.All', 'Channel.ReadBasic.All', 'ChannelMessage.Send', 'Chat.ReadWrite'];

export default microsoftAuth('microsoft-teams', TEAMS_SCOPES, { tenant: 'organizations' });
