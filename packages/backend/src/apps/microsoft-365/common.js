import { GRAPH, drivePath, enc, graphList } from '../../helpers/microsoft-graph.js';

export const ITEM_FIELDS = 'id,name,size,webUrl,createdDateTime,lastModifiedDateTime,folder,file,parentReference';
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // upload simples do Graph (até 4 MB)

export function folderChildrenPath(folder) {
  const p = drivePath(folder);
  return p ? `/me/drive/root:/${p}:/children` : '/me/drive/root/children';
}

export function slimItem(i) {
  return {
    id: i.id,
    name: i.name,
    type: i.folder ? 'folder' : 'file',
    size: i.size,
    mimeType: i.file?.mimeType,
    childCount: i.folder?.childCount,
    path: i.parentReference?.path ? `${i.parentReference.path.replace(/^\/drive\/root:?/, '')}/${i.name}` : i.name,
    webUrl: i.webUrl,
    lastModifiedDateTime: i.lastModifiedDateTime,
  };
}

export async function listTaskLists($) {
  return graphList($, '/me/todo/lists', {}, 100);
}

export async function listFolders($) {
  const items = await graphList($, '/me/drive/root/children', { $top: 200, $select: ITEM_FIELDS }, 200);
  return items.filter((i) => i.folder);
}

export { GRAPH, drivePath, enc };
