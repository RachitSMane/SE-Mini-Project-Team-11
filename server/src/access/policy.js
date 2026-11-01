// The single implementation of the FR-051 permission matrix (SAD §3.9.3, COMP-05).
export const ACTIONS = Object.freeze({
  VIEW: 'view', // view board, participants, members, versions; preview a version
  EDIT: 'edit', // draw, add, edit, move, restyle, erase, delete objects
  CLEAR: 'clear',
  RESTORE: 'restore',
  MANAGE_LINKS: 'manage_links', // create, list, revoke share links
  MANAGE_MEMBERS: 'manage_members', // change roles, remove members
  TRANSFER: 'transfer',
  DELETE: 'delete',
});

export const ROLES = Object.freeze(['owner', 'editor', 'viewer']);

const MATRIX = Object.freeze({
  view: ['owner', 'editor', 'viewer'],
  edit: ['owner', 'editor'],
  clear: ['owner'],
  restore: ['owner'],
  manage_links: ['owner'],
  manage_members: ['owner'],
  transfer: ['owner'],
  delete: ['owner'],
});

export function permits(role, action) {
  const allowed = MATRIX[action];
  if (!allowed) throw new Error(`Unknown action ${action}`);
  return allowed.includes(role);
}

export function actionForOperation(type) {
  return type === 'board:clear' ? ACTIONS.CLEAR : ACTIONS.EDIT;
}

const RANK = { viewer: 1, editor: 2, owner: 3 };
export function roleRank(role) {
  return RANK[role] || 0;
}
