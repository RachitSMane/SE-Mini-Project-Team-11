// Data integrity check (issue #20), run by start-up recovery before the server accepts connections.
//
// Why it is needed: deleting a board (accessService.deleteBoard) removes the board document first and
// then its objects, versions, memberships and links. MongoDB runs these as separate writes, so a crash
// in between leaves "orphans" that belong to no board. An ownership transfer interrupted between its
// steps 3 and 4 (SD-04) leaves a membership row for the new Owner, who must only be stored on the board.
// Neither is visible to users (every query starts from the board and the Owner row is filtered out),
// but they waste space and break the invariants of SAD §3.6. This module finds them and removes them.
import { Board, BoardObject, DURABLE, Membership, ShareLink, User, Version } from './models.js';

const CHILD_COLLECTIONS = Object.freeze([
  // Report keys must not match the logger's redaction pattern (logger.js REDACT_KEY drops any key
  // containing "objects"), so board objects are reported as "elements".
  ['elements', BoardObject],
  ['versions', Version],
  ['memberships', Membership],
  ['shareLinks', ShareLink],
]);

/**
 * Checks the integrity rules below and, with repair = true (the default), removes the offending
 * documents. Returns the number of documents found per rule.
 *   orphans.<name>          documents whose boardId refers to no existing board
 *                           (elements = boardObjects, versions, memberships, shareLinks)
 *   ownerMemberships        membership rows of a board's own Owner
 *   missingUserMemberships  membership rows of users that do not exist
 */
export async function checkIntegrity({ repair = true } = {}) {
  const report = { orphans: {}, ownerMemberships: 0, missingUserMemberships: 0, repaired: repair };
  const boardIds = await Board.distinct('_id');

  // 1. Orphans: children of boards that no longer exist.
  for (const [name, Model] of CHILD_COLLECTIONS) {
    const orphanBoardIds = await Model.distinct('boardId', { boardId: { $nin: boardIds } });
    if (orphanBoardIds.length === 0) {
      report.orphans[name] = 0;
      continue;
    }
    const filter = { boardId: { $in: orphanBoardIds } };
    report.orphans[name] = repair ? (await Model.deleteMany(filter, DURABLE)).deletedCount : await Model.countDocuments(filter);
  }

  // 2. Membership rows of the board's Owner (interrupted ownership transfer, step 4 not done).
  const ownerRows = await Membership.aggregate([
    { $lookup: { from: 'boards', localField: 'boardId', foreignField: '_id', as: 'board' } },
    { $unwind: '$board' },
    { $match: { $expr: { $eq: ['$userId', '$board.ownerId'] } } },
    { $project: { _id: 1 } },
  ]);
  report.ownerMemberships = ownerRows.length;
  if (repair && ownerRows.length) await Membership.deleteMany({ _id: { $in: ownerRows.map((r) => r._id) } }, DURABLE);

  // 3. Membership rows of users that do not exist (accounts are never deleted by the application,
  // so these can only come from manual changes; the row could never be used to sign in).
  const userIds = await User.distinct('_id');
  const missingFilter = { userId: { $nin: userIds } };
  report.missingUserMemberships = repair
    ? (await Membership.deleteMany(missingFilter, DURABLE)).deletedCount
    : await Membership.countDocuments(missingFilter);

  return report;
}

/** Total number of problems in a report. */
export function problemCount(report) {
  return Object.values(report.orphans).reduce((a, b) => a + b, 0) + report.ownerMemberships + report.missingUserMemberships;
}
