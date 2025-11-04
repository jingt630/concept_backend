import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Session" + ".";

// Generic types
type Session = ID;
type User = ID;
type DateTime = Date;

/**
 * Session Concept
 *
 * Manages user authentication sessions to ensure users are actually logged in
 * and not just copying URLs. Each session has a unique token and expiration time.
 *
 * Design Rationale:
 * - Sessions prevent URL copying by requiring valid authentication tokens
 * - Expiration times (24 hours) force periodic re-authentication
 * - Session tokens are unique IDs that can't be guessed
 * - All session data stored server-side for security
 */
interface SessionDoc {
  _id: Session;
  user: User;
  token: string; // Unique session token sent to client
  createdAt: DateTime;
  expiresAt: DateTime;
  isActive: boolean;
}

export default class SessionConcept {
  private readonly sessions: Collection<SessionDoc>;
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
    // Create index on token for fast lookups
    this.sessions.createIndex({ token: 1 });
    this.sessions.createIndex({ user: 1 });
  }

  /**
   * create(user: User): {session: Session, token: String}
   *
   * **requires**: user must be a valid User ID
   *
   * **effects**:
   *   - Creates a new session for the user
   *   - Generates a unique session token
   *   - Sets expiration time to 24 hours from now
   *   - Returns session ID and token
   */
  async create(
    { user }: { user: User },
  ): Promise<{ session: Session; token: string }> {
    const sessionId = freshID();
    const token = freshID(); // Use fresh ID as session token
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION_MS);

    const sessionDoc: SessionDoc = {
      _id: sessionId,
      user,
      token,
      createdAt: now,
      expiresAt,
      isActive: true,
    };

    await this.sessions.insertOne(sessionDoc);
    console.log(
      `✅ Created session for user ${user}, expires at ${expiresAt.toISOString()}`,
    );

    return { session: sessionId, token };
  }

  /**
   * end(session: Session)
   *
   * **requires**: session must exist
   *
   * **effects**: Marks the session as inactive (logout)
   */
  async end(
    { session }: { session: Session },
  ): Promise<Empty | { error: string }> {
    const result = await this.sessions.updateOne(
      { _id: session },
      { $set: { isActive: false } },
    );

    if (result.matchedCount === 0) {
      return { error: "Session not found." };
    }

    console.log(`🔴 Ended session ${session}`);
    return {};
  }

  /**
   * endByToken(token: String)
   *
   * **requires**: token must exist
   *
   * **effects**: Marks the session with the given token as inactive
   */
  async endByToken(
    { token }: { token: string },
  ): Promise<Empty | { error: string }> {
    const result = await this.sessions.updateOne(
      { token },
      { $set: { isActive: false } },
    );

    if (result.matchedCount === 0) {
      return { error: "Session not found." };
    }

    console.log(`🔴 Ended session with token ${token}`);
    return {};
  }

  /**
   * _getSessionByToken(token: String): {session: Session, user: User, isValid: Boolean}
   *
   * **requires**: none
   *
   * **effects**:
   *   - Looks up session by token
   *   - Checks if session is active and not expired
   *   - Returns session info with validity status
   */
  async _getSessionByToken({ token }: { token: string }): Promise<
    Array<{ session: Session; user: User; isValid: boolean }>
  > {
    const sessionDoc = await this.sessions.findOne({ token });

    if (!sessionDoc) {
      return [];
    }

    const now = new Date();
    const isValid = sessionDoc.isActive && sessionDoc.expiresAt > now;

    if (!isValid) {
      console.log(
        `⚠️ Invalid session: ${sessionDoc.isActive ? "expired" : "inactive"}`,
      );
    }

    return [{
      session: sessionDoc._id,
      user: sessionDoc.user,
      isValid,
    }];
  }

  /**
   * _getActiveSessions(user: User): Array<{session: Session, createdAt: DateTime}>
   *
   * **requires**: none
   *
   * **effects**: Returns all active, non-expired sessions for a user
   */
  async _getActiveSessions({ user }: { user: User }): Promise<
    Array<{ session: Session; createdAt: DateTime }>
  > {
    const now = new Date();
    const sessions = await this.sessions
      .find({
        user,
        isActive: true,
        expiresAt: { $gt: now },
      })
      .toArray();

    return sessions.map((s) => ({
      session: s._id,
      createdAt: s.createdAt,
    }));
  }

  /**
   * _validateSession(token: String): {isValid: Boolean, user?: User}
   *
   * Helper query to quickly check if a session token is valid
   *
   * **requires**: none
   *
   * **effects**: Returns validation status and user ID if valid
   */
  async _validateSession({ token }: { token: string }): Promise<
    Array<{ isValid: boolean; user?: User }>
  > {
    const result = await this._getSessionByToken({ token });

    if (result.length === 0) {
      return [{ isValid: false }];
    }

    const { isValid, user } = result[0];
    return [{ isValid, user: isValid ? user : undefined }];
  }

  /**
   * _cleanupExpiredSessions()
   *
   * **effects**: Removes all expired sessions (maintenance function)
   */
  async _cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
    const now = new Date();
    const result = await this.sessions.deleteMany({
      expiresAt: { $lt: now },
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} expired sessions`);
    return { deletedCount: result.deletedCount || 0 };
  }
}
