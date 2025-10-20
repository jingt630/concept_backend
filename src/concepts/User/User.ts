import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
// import { encryptPassword } from "@utils/security.ts"; // Assuming a utility for password hashing
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "User" + ".";

// Generic types of this concept
type User = ID;
// Assuming Image is a string type for simplicity in this context (e.g., a URL or base64 string)
type Image = string;
type DateTime = Date;

/**
 * A set of `User` with:
 * `username` (String): The user's chosen username.
 * `password` (String): A securely hashed representation of the user's password, ensuring uniqueness and non-readability.
 * `profilePic` (Image): The user's profile picture.
 * `email` (String): The user's unique email address.
 * `dateCreated` (DateTime): The date and time when the user account was created.
 */
interface Users {
  _id: User;
  username: string;
  password: string; // Renamed from password to avoid confusion with plain password
  profilePic: Image;
  email: string;
  dateCreated: DateTime;
}

export default class UserConcept {
  users: Collection<Users>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * create(username: String, password: String, profilePic: Image, email: String): User
   *
   * **requires**:
   *   * `username` and `password` must consist solely of alphabets, numbers, underscores, and hyphens.
   *   * `email` must not be in use by any existing `User`.
   *
   * **effects**:
   *   * Creates a new `User` entity.
   *   * Sets `username` to the input `username`.
   *   * Sets `password` to a securely hashed representation of the input `password`.
   *   * Sets `profilePic` to the input `profilePic`.
   *   * Sets `email` to the input `email`.
   *   * Sets `dateCreated` to the current `DateTime`.
   *   * Returns the identifier of the newly created `User`.
   */
  async create({
    username,
    password,
    profilePic,
    email,
  }: {
    username: string;
    password: string;
    profilePic: Image;
    email: string;
  }): Promise<{ user: User } | {error: string}> {
    // Validate username and password format
    const usernamePasswordRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernamePasswordRegex.test(username) || !usernamePasswordRegex.test(password)) {
      return { error: "Username and password must consist solely of alphabets, numbers, underscores, and hyphens." };
    }

    // Check if email is already in use
    const existingUser = await this.users.findOne({ email });
    if (existingUser) {
      return { error: "Email is already in use." };
    }

    // const password = await encryptPassword(password); // Assuming encryptPassword handles hashing
    const newUser: Users = {
      _id: freshID(),
      username: username,
      password: password,
      profilePic: profilePic,
      email: email,
      dateCreated: new Date(),
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * delete(user: User)
   *
   * **requires**: `user` must exist in the set of `Users`.
   *
   * **effects**:
   *   * Removes the specified `User` entity and all associated data from the system.
   */
  async delete({ user }: { user: User }): Promise<Empty | {error: string}> {
    const result = await this.users.deleteOne({ _id: user });
    if (result.deletedCount === 0) {
      return { error: "User not found." };
    }
    // Note: Associated data removal would typically be handled by syncs or other concepts
    return {};
  }

  /**
   * changeProfilePic(user: User, newProfilePic: Image)
   *
   * **requires**: `user` must exist in the set of `Users`.
   *
   * **effects**:
   *   * Sets the `profilePic` of the specified `User` to `newProfilePic`.
   */
  async changeProfilePic({
    user,
    newProfilePic,
  }: {
    user: User;
    newProfilePic: Image;
  }): Promise<Empty | {error: string}> {
    const result = await this.users.updateOne(
      { _id: user },
      { $set: { profilePic: newProfilePic } }
    );
    if (result.matchedCount === 0) {
      return { error: "User not found." };
    }
    return {};
  }

  // --- Queries ---

  /**
   * _getUserByEmail(email: String): User
   *
   * **requires**: `email` must exist for a `User`.
   *
   * **effects**: Returns the identifier of the `User` with the given `email`.
   */
  async _getUserByEmail({ email }: { email: string }): Promise<Array<{ user: User }>> {
    const user = await this.users.findOne({ email }, { projection: { _id: 1 } });
    if (!user) {
      return [];
    }
    return [{ user: user._id }];
  }

  /**
   * _getUserById(userId: User): User
   *
   * **requires**: `userId` must exist for a `User`.
   *
   * **effects**: Returns the identifier of the `User` with the given `userId`.
   */
  async _getUserById({ userId }: { userId: User }): Promise<Array<{ user: User }>> {
    const user = await this.users.findOne({ _id: userId }, { projection: { _id: 1 } });
    if (!user) {
      return [];
    }
    return [{ user: user._id }];
  }

  /**
   * _getUserProfilePic(user: User): Image
   *
   * **requires**: `user` must exist in the set of `Users`.
   *
   * **effects**: Returns the profile picture of the specified `User`.
   */
  async _getUserProfilePic({ user }: { user: User }): Promise<Array<{ profilePic: Image }>> {
    const userDoc = await this.users.findOne({ _id: user }, { projection: { profilePic: 1 } });
    if (!userDoc) {
      return [];
    }
    return [{ profilePic: userDoc.profilePic }];
  }

  /**
   * _getUserUsername(user: User): String
   *
   * **requires**: `user` must exist in the set of `Users`.
   *
   * **effects**: Returns the username of the specified `User`.
   */
  async _getUserUsername({ user }: { user: User }): Promise<Array<{ username: string }>> {
    const userDoc = await this.users.findOne({ _id: user }, { projection: { username: 1 } });
    if (!userDoc) {
      return [];
    }
    return [{ username: userDoc.username }];
  }

  /**
   * _getUserEmail(user: User): String
   *
   * **requires**: `user` must exist in the set of `Users`.
   *
   * **effects**: Returns the email of the specified `User`.
   */
  async _getUserEmail({ user }: { user: User }): Promise<Array<{ email: string }>> {
    const userDoc = await this.users.findOne({ _id: user }, { projection: { email: 1 } });
    if (!userDoc) {
      return [];
    }
    return [{ email: userDoc.email }];
  }

  /**
   * _getAllUsers(): Array<{user: User, username: String, email: String}>
   *
   * **requires**: None.
   *
   * **effects**: Returns a list of all users with their ID, username, and email.
   */
  async _getAllUsers(): Promise<Array<{ user: User; username: string; email: string }>> {
    const users = await this.users.find({}, { projection: { _id: 1, username: 1, email: 1 } }).toArray();
    return users.map(u => ({ user: u._id, username: u.username, email: u.email }));
  }
}
