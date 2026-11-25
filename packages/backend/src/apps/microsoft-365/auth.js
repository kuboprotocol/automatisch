import { microsoftAuth } from '../../helpers/microsoft-graph.js';

export const M365_SCOPES = ['Files.ReadWrite', 'Tasks.ReadWrite'];

export default microsoftAuth('microsoft-365', M365_SCOPES);
