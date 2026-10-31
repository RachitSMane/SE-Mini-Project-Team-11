// COMP-05 Board & Access Service: boards, members, share links, ownership transfer and the
// authorize() entry point used by every REST route and Socket.IO handler (SAD §3.9.3).
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Board, BoardObject, Membership, ShareLink, User, Version, DURABLE } from '../db/models.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { validateBody } from '../validation.js';
import { ACTIONS, permits, roleRank } from './policy.js';

const EXPIRY_MS = { '1h': 3_600_000, '24h': 86_400_000, '7d': 604_800_000 }; // D4a

export function hashLinkToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isObjectId(id) {
  return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);
}

export class AccessService {
  constructor({ config, queues, auth }) {
    this.config = config;
    this.queues = queues;
    this.auth = auth;
    this.realtime = null; // set by the realtime server (role-change notifications, disconnects)
  }

  /**
   * Role of an actor on a board, from server-side data only. Returns {board, role, link}; role is
   * null when the actor has no role. Guest links are re-checked for expiry and revocation.
   */
  async resolveRole(actor, boardId) {
    if (!isObjectId(boardId)) return { board: null, role: null };
    const board = await Board.findById(boardId, { title: 1, ownerId: 1, updatedAt: 1 }).lean();
    if (!board) return { board: null, role: null };
    if (actor.type === 'user') {
      if (String(board.ownerId) === actor.id) return { board, role: 'owner' };
      const m = await Membership.findOne({ boardId, userId: actor.id }, { role: 1 }).lean();
      return { board, role: m ? m.role : null };
    }
    if (actor.type === 'guest') {
      if (actor.boardId !== String(boardId)) return { board, role: null };
      const link = await ShareLink.findById(actor.linkId).lean();
      if (!link || String(link.boardId) !== String(boardId)) return { board, role: null };
      if (link.revokedAt) return { board, role: null, linkError: 'LINK_REVOKED' };
      if (link.expiresAt.getTime() <= Date.now()) return { board, role: null, linkError: 'LINK_EXPIRED' };
      return { board, role: link.role, link };
    }
    return { board: null, role: null };
  }

  /** Throws BOARD_NOT_FOUND (no role), LINK_* (guest link gone) or FORBIDDEN (role too low). */
  async authorize(actor, boardId, action, ctx = {}) {
    const result = await this.resolveRole(actor, boardId);
    let code = null;
    if (!result.role) code = result.linkError || 'BOARD_NOT_FOUND';
    else if (!permits(result.role, action)) code = 'FORBIDDEN';
    if (code) {
      logger.security({
        event: 'authz.denied',
        requestId: ctx.requestId,
        socketId: ctx.socketId,
        actor,
        boardId: result.board ? boardId : null,
        outcome: 'rejected',
        reason: code,
        details: result.role ? { role: result.role } : undefined,
      });
      throw new AppError(code);
    }
    return result;
  }

  // ---- Boards (FR-042 to FR-044) ----
  async createBoard(actor, title) {
    const [board] = await Board.create([{ title: title.trim(), ownerId: actor.id }], DURABLE);
    return { id: String(board._id), title: board.title, role: 'owner', updatedAt: board.updatedAt };
  }

  async listBoards(actor) {
    const owned = await Board.find({ ownerId: actor.id }, { title: 1, updatedAt: 1 }).lean();
    const memberships = await Membership.find({ userId: actor.id }, { boardId: 1, role: 1 }).lean();
    const memberBoards = await Board.find(
      { _id: { $in: memberships.map((m) => m.boardId) }, ownerId: { $ne: actor.id } },
      { title: 1, updatedAt: 1 },
    ).lean();
    const roleOf = new Map(memberships.map((m) => [String(m.boardId), m.role]));
    return [
      ...owned.map((b) => ({ id: String(b._id), title: b.title, role: 'owner', updatedAt: b.updatedAt })),
      ...memberBoards.map((b) => ({ id: String(b._id), title: b.title, role: roleOf.get(String(b._id)), updatedAt: b.updatedAt })),
    ].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getBoard(actor, boardId, ctx) {
    const { board, role } = await this.authorize(actor, boardId, ACTIONS.VIEW, ctx);
    return { id: String(board._id), title: board.title, ownerId: String(board.ownerId), role, updatedAt: board.updatedAt };
  }

  async deleteBoard(actor, boardId, ctx) {
    await this.authorize(actor, boardId, ACTIONS.DELETE, ctx);
    await this.queues.run(boardId, async () => {
      // Re-check inside the queue: a concurrent transfer may have changed the Owner.
      await this.authorize(actor, boardId, ACTIONS.DELETE, ctx);
      this.realtime?.boardDeleted(boardId);
      await Board.deleteOne({ _id: boardId }, DURABLE);
      await Promise.all([
        BoardObject.deleteMany({ boardId }, DURABLE),
        Version.deleteMany({ boardId }, DURABLE),
        Membership.deleteMany({ boardId }, DURABLE),
        ShareLink.deleteMany({ boardId }, DURABLE),
      ]);
      this.realtime?.evict(boardId);
    });
    logger.security({ event: 'board.deleted', requestId: ctx.requestId, actor, boardId, outcome: 'success' });
  }

  /**
   * Rename a board (issue #13). Owner only; the title follows the creation rule (FR-042). Runs in
   * the board queue so it cannot interleave with a concurrent delete or ownership transfer, and
   * open board views are told the new title without a reload.
   */
  async renameBoard(actor, boardId, title, ctx) {
    await this.authorize(actor, boardId, ACTIONS.RENAME, ctx);
    const board = await this.queues.run(boardId, async () => {
      // Re-check inside the queue: the board may have been deleted or transferred meanwhile.
      const { role } = await this.authorize(actor, boardId, ACTIONS.RENAME, ctx);
      const updated = await Board.findOneAndUpdate(
        { _id: boardId },
        { $set: { title: title.trim() } },
        { new: true, projection: { title: 1, updatedAt: 1 }, ...DURABLE },
      ).lean();
      if (!updated) throw new AppError('BOARD_NOT_FOUND');
      this.realtime?.boardRenamed(boardId, updated.title);
      return { ...updated, role };
    });
    logger.info('board.renamed', { requestId: ctx.requestId, boardId: String(boardId), actorId: actor.id });
    return { id: String(board._id), title: board.title, role: board.role, updatedAt: board.updatedAt };
  }

  // ---- Share links (FR-045 to FR-048, SEC-REQ-004) ----
  async createLink(actor, boardId, { role, expiresIn = '7d' }, ctx) {
    await this.authorize(actor, boardId, ACTIONS.MANAGE_LINKS, ctx);
    const token = crypto.randomBytes(32).toString('base64url'); // 256 bits, 43 characters (D8e)
    const ttlMs = this.config.linkExpiryOverrideSec ? this.config.linkExpiryOverrideSec * 1000 : EXPIRY_MS[expiresIn];
    const [link] = await ShareLink.create(
      [{ boardId, tokenHash: hashLinkToken(token), role, expiresAt: new Date(Date.now() + ttlMs), createdBy: actor.id }],
      DURABLE,
    );
    logger.security({
      event: 'link.created',
      requestId: ctx.requestId,
      actor,
      boardId,
      outcome: 'success',
      details: { linkId: String(link._id), role },
    });
    return {
      linkId: String(link._id),
      url: `${this.config.publicUrl}/join#${token}`,
      role,
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  async listLinks(actor, boardId, ctx) {
    await this.authorize(actor, boardId, ACTIONS.MANAGE_LINKS, ctx);
    const links = await ShareLink.find(
      { boardId, revokedAt: null, expiresAt: { $gt: new Date() } },
      { role: 1, expiresAt: 1, createdAt: 1 },
    )
      .sort({ createdAt: -1 })
      .lean();
    return links.map((l) => ({
      linkId: String(l._id),
      role: l.role,
      expiresAt: l.expiresAt.toISOString(),
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async revokeLink(actor, boardId, linkId, ctx) {
    await this.authorize(actor, boardId, ACTIONS.MANAGE_LINKS, ctx);
    if (!isObjectId(linkId)) throw new AppError('LINK_NOT_FOUND');
    const res = await ShareLink.updateOne(
      { _id: linkId, boardId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      DURABLE,
    );
    if (res.matchedCount === 0) throw new AppError('LINK_NOT_FOUND');
    this.realtime?.linkRevoked(boardId, linkId);
    logger.security({
      event: 'link.revoked',
      requestId: ctx.requestId,
      actor,
      boardId,
      outcome: 'success',
      details: { linkId },
    });
  }

  /**
   * Resolve a share-link token (FR-046). With a session actor: create or keep a membership.
   * Without: issue a guest token for the board.
   */
  async resolveLink({ token, displayName }, sessionActor) {
    const link = await ShareLink.findOne({ tokenHash: hashLinkToken(token) }).lean();
    if (!link) throw new AppError('LINK_NOT_FOUND');
    if (link.revokedAt) throw new AppError('LINK_REVOKED');
    if (link.expiresAt.getTime() <= Date.now()) throw new AppError('LINK_EXPIRED');
    const board = await Board.findById(link.boardId, { ownerId: 1 }).lean();
    if (!board) throw new AppError('LINK_NOT_FOUND');
    const boardId = String(link.boardId);
    if (sessionActor) {
      if (String(board.ownerId) === sessionActor.id) return { boardId, role: 'owner' };
      const role = await this.queues.run(boardId, async () => {
        const existing = await Membership.findOne({ boardId, userId: sessionActor.id }).lean();
        if (existing && roleRank(existing.role) >= roleRank(link.role)) return existing.role;
        await Membership.updateOne(
          { boardId, userId: sessionActor.id },
          { $set: { role: link.role } },
          { upsert: true, ...DURABLE },
        );
        if (existing) this.realtime?.roleChanged(boardId, sessionActor.id, link.role);
        return link.role;
      });
      return { boardId, role };
    }
    if (!displayName) throw new AppError('VALIDATION_FAILED', 'A display name of 1-30 characters is required to join as a guest.');
    const guest = this.auth.issueGuestToken(link, displayName);
    return { boardId, role: link.role, guestToken: guest.guestToken, expiresAt: guest.expiresAt };
  }

  // ---- Members (FR-049) ----
  async listMembers(actor, boardId, ctx) {
    const { board } = await this.authorize(actor, boardId, ACTIONS.VIEW, ctx);
    const memberships = await Membership.find({ boardId, userId: { $ne: board.ownerId } }, { userId: 1, role: 1 }).lean();
    const users = await User.find(
      { _id: { $in: [board.ownerId, ...memberships.map((m) => m.userId)] } },
      { displayName: 1 },
    ).lean();
    const names = new Map(users.map((u) => [String(u._id), u.displayName]));
    return [
      { userId: String(board.ownerId), displayName: names.get(String(board.ownerId)) || '', role: 'owner' },
      ...memberships.map((m) => ({ userId: String(m.userId), displayName: names.get(String(m.userId)) || '', role: m.role })),
    ];
  }

  async changeMemberRole(actor, boardId, userId, role, ctx) {
    await this.authorize(actor, boardId, ACTIONS.MANAGE_MEMBERS, ctx);
    if (!isObjectId(userId)) throw new AppError('MEMBER_NOT_FOUND');
    const fromRole = await this.queues.run(boardId, async () => {
      await this.assertNotOwner(boardId, userId);
      const m = await Membership.findOneAndUpdate({ boardId, userId }, { $set: { role } }, { ...DURABLE }).lean();
      if (!m) throw new AppError('MEMBER_NOT_FOUND');
      this.realtime?.roleChanged(boardId, userId, role);
      return m.role;
    });
    logger.security({
      event: 'member.role_changed',
      requestId: ctx.requestId,
      actor,
      boardId,
      subjectId: userId,
      outcome: 'success',
      details: { fromRole, toRole: role },
    });
    return { userId, role };
  }

  /**
   * Inside a board task: the board may have been deleted while the request waited, and the Owner
   * is never a member row (a leftover row after an interrupted transfer must not be changed).
   */
  async assertNotOwner(boardId, userId) {
    const board = await Board.findById(boardId, { ownerId: 1 }).lean();
    if (!board) throw new AppError('BOARD_NOT_FOUND');
    if (String(board.ownerId) === userId) throw new AppError('MEMBER_NOT_FOUND', 'The Owner is not a member row; use ownership transfer.');
  }

  async removeMember(actor, boardId, userId, ctx) {
    await this.authorize(actor, boardId, ACTIONS.MANAGE_MEMBERS, ctx);
    if (!isObjectId(userId)) throw new AppError('MEMBER_NOT_FOUND');
    await this.queues.run(boardId, async () => {
      await this.assertNotOwner(boardId, userId);
      const res = await Membership.deleteOne({ boardId, userId }, DURABLE);
      if (res.deletedCount === 0) throw new AppError('MEMBER_NOT_FOUND');
      this.realtime?.memberRemoved(boardId, userId);
    });
    logger.security({ event: 'member.removed', requestId: ctx.requestId, actor, boardId, subjectId: userId, outcome: 'success' });
  }

  // ---- Ownership transfer (FR-050, API-02, SD-04) ----
  async transferOwnership(actor, boardId, body, ctx) {
    if (actor.type !== 'user') {
      logger.security({ event: 'authz.denied', requestId: ctx.requestId, actor, boardId: null, outcome: 'rejected', reason: 'FORBIDDEN' });
      throw new AppError('FORBIDDEN', 'Guests cannot transfer or hold board ownership.');
    }
    await this.authorize(actor, boardId, ACTIONS.TRANSFER, ctx);
    validateBody('transfer', body);
    const { newOwnerId } = body;
    if (newOwnerId === actor.id || !isObjectId(newOwnerId)) throw new AppError('INVALID_TARGET');
    const result = await this.queues.run(boardId, async () => {
      // 1. queue paused (we are the running task). The requester must still be the Owner: a
      // concurrent transfer that ran first makes this one fail with 403 and change nothing.
      await this.authorize(actor, boardId, ACTIONS.TRANSFER, ctx);
      // Eligibility: a registered Editor or Viewer member.
      const target = await Membership.findOne({ boardId, userId: newOwnerId }).lean();
      const targetUser = target ? await User.exists({ _id: newOwnerId }) : null;
      if (!target || !targetUser) throw new AppError('INVALID_TARGET');
      // 2. requester becomes an Editor member.
      await Membership.updateOne({ boardId, userId: actor.id }, { $set: { role: 'editor' } }, { upsert: true, ...DURABLE });
      // 3. conditional owner change: loses a race with a concurrent transfer -> 403.
      const upd = await Board.updateOne(
        { _id: boardId, ownerId: actor.id },
        { $set: { ownerId: new mongoose.Types.ObjectId(newOwnerId) } },
        DURABLE,
      );
      if (upd.modifiedCount !== 1) throw new AppError('FORBIDDEN');
      // 4. the Owner is stored on the board only.
      await Membership.deleteOne({ boardId, userId: newOwnerId }, DURABLE);
      this.realtime?.ownershipTransferred(boardId, actor.id, newOwnerId);
      return { boardId: String(boardId), ownerId: newOwnerId, previousOwner: { userId: actor.id, role: 'editor' } };
    });
    logger.security({
      event: 'board.ownership_transferred',
      requestId: ctx.requestId,
      actor,
      boardId,
      subjectId: newOwnerId,
      outcome: 'success',
    });
    return result;
  }
}
