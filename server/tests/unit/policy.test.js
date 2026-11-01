// FR-051 permission matrix (SRS §4.4) as implemented by COMP-05 policy.js.
import { ACTIONS, actionForOperation, permits, roleRank } from '../../src/access/policy.js';

// Row of the SRS matrix -> roles marked "Yes".
const SRS_MATRIX = {
  [ACTIONS.VIEW]: ['owner', 'editor', 'viewer'],
  [ACTIONS.EDIT]: ['owner', 'editor'],
  [ACTIONS.CLEAR]: ['owner'],
  [ACTIONS.RESTORE]: ['owner'],
  [ACTIONS.MANAGE_LINKS]: ['owner'],
  [ACTIONS.MANAGE_MEMBERS]: ['owner'],
  [ACTIONS.TRANSFER]: ['owner'],
  [ACTIONS.DELETE]: ['owner'],
};

describe('permission matrix (FR-051)', () => {
  test.each(Object.entries(SRS_MATRIX))('%s is permitted exactly to %j', (action, allowed) => {
    for (const role of ['owner', 'editor', 'viewer']) {
      expect(permits(role, action)).toBe(allowed.includes(role));
    }
  });

  test('no role, unknown roles and guest-like values are never permitted', () => {
    for (const action of Object.values(ACTIONS)) {
      for (const role of [null, undefined, '', 'guest', 'admin', 'OWNER']) {
        expect(permits(role, action)).toBe(false);
      }
    }
  });

  test('unknown actions throw instead of defaulting to allow', () => {
    expect(() => permits('owner', 'launch_missiles')).toThrow(/Unknown action/);
  });

  test('operation types map to edit, except board:clear', () => {
    expect(actionForOperation('object:add')).toBe(ACTIONS.EDIT);
    expect(actionForOperation('object:update')).toBe(ACTIONS.EDIT);
    expect(actionForOperation('object:delete')).toBe(ACTIONS.EDIT);
    expect(actionForOperation('board:clear')).toBe(ACTIONS.CLEAR);
  });

  test('role ranking used for "equal or higher role" on link resolution (FR-046)', () => {
    expect(roleRank('owner')).toBeGreaterThan(roleRank('editor'));
    expect(roleRank('editor')).toBeGreaterThan(roleRank('viewer'));
    expect(roleRank('viewer')).toBeGreaterThan(roleRank(null));
  });
});
