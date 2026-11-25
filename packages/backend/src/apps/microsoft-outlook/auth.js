import { microsoftAuth } from '../../helpers/microsoft-graph.js';

export const OUTLOOK_SCOPES = ['Mail.ReadWrite', 'Mail.Send', 'Calendars.ReadWrite'];

export default microsoftAuth('microsoft-outlook', OUTLOOK_SCOPES);
