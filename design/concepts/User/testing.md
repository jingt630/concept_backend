[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test User

Testing concepts. Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
Saving test execution output. Save the test execution output by copy-pasting from the console to a markdown file.

# response:

# file: src/User/UserConcept.test.ts

```typescript
import { testDb } from "@utils/database.ts";
import UserConcept from "./UserConcept.ts";
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { ID } from "@utils/types.ts";
import { encryptPassword } from "@utils/security.ts";

Deno.test("UserConcept: Operational Principle", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  console.log("--- Test: UserConcept Operational Principle ---");

  // 1. Create a user
  const createUserArgs = {
    username: "alice_wonderland",
    password: "Password123!",
    profilePic: "http://example.com/alice.jpg",
    email: "alice@example.com",
  };
  console.log("Action: create", createUserArgs);
  const createResult = await userConcept.create(createUserArgs);
  console.log("Output:", createResult);
  assertEquals(typeof createResult.user, "string", "create should return a user ID");

  // 2. Verify user creation and retrieve details
  const userId = createResult.user;
  const getUserByIdResult = await userConcept._getUserById({ userId });
  console.log("Query: _getUserById", { userId });
  console.log("Output:", getUserByIdResult);
  assertEquals(getUserByIdResult.length, 1, "_getUserById should return one user");
  assertEquals(getUserByIdResult[0].user, userId, "Returned user ID should match input");

  const getUsernameResult = await userConcept._getUserUsername({ user: userId });
  console.log("Query: _getUserUsername", { user: userId });
  console.log("Output:", getUsernameResult);
  assertEquals(getUsernameResult.length, 1, "_getUserUsername should return one username");
  assertEquals(getUsernameResult[0].username, createUserArgs.username, "Username should match");

  const getEmailResult = await userConcept._getUserEmail({ user: userId });
  console.log("Query: _getUserEmail", { user: userId });
  console.log("Output:", getEmailResult);
  assertEquals(getEmailResult.length, 1, "_getUserEmail should return one email");
  assertEquals(getEmailResult[0].email, createUserArgs.email, "Email should match");

  const getProfilePicResult = await userConcept._getUserProfilePic({ user: userId });
  console.log("Query: _getUserProfilePic", { user: userId });
  console.log("Output:", getProfilePicResult);
  assertEquals(getProfilePicResult.length, 1, "_getUserProfilePic should return one profile pic");
  assertEquals(getProfilePicResult[0].profilePic, createUserArgs.profilePic, "Profile pic should match");

  // 3. Change profile picture
  const newProfilePic = "http://example.com/alice_new.jpg";
  const changeProfilePicArgs = { user: userId, newProfilePic: newProfilePic };
  console.log("Action: changeProfilePic", changeProfilePicArgs);
  const changeProfilePicResult = await userConcept.changeProfilePic(changeProfilePicArgs);
  console.log("Output:", changeProfilePicResult);
  assertEquals(changeProfilePicResult, {}, "changeProfilePic should return an empty object on success");

  // 4. Verify profile picture change
  const updatedProfilePicResult = await userConcept._getUserProfilePic({ user: userId });
  console.log("Query: _getUserProfilePic after change", { user: userId });
  console.log("Output:", updatedProfilePicResult);
  assertEquals(updatedProfilePicResult.length, 1, "Profile pic query after change should return one result");
  assertEquals(updatedProfilePicResult[0].profilePic, newProfilePic, "Profile pic should be updated");

  // 5. Delete the user
  const deleteUserArgs = { user: userId };
  console.log("Action: delete", deleteUserArgs);
  const deleteResult = await userConcept.delete(deleteUserArgs);
  console.log("Output:", deleteResult);
  assertEquals(deleteResult, {}, "delete should return an empty object on success");

  // 6. Verify user deletion
  const verifyDeleteResult = await userConcept._getUserById({ userId });
  console.log("Query: _getUserById after delete", { userId });
  console.log("Output:", verifyDeleteResult);
  assertEquals(verifyDeleteResult.length, 0, "_getUserById should return no user after deletion");

  await client.close();
});

Deno.test("UserConcept: Interesting Scenarios", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  console.log("\n--- Test: UserConcept Interesting Scenarios ---");

  // Scenario 1: Create user with invalid username/password format
  const invalidFormatArgs = {
    username: "alice!",
    password: "Password123",
    profilePic: "http://example.com/invalid.jpg",
    email: "invalid@example.com",
  };
  console.log("Action: create (invalid format)", invalidFormatArgs);
  const invalidFormatResult = await userConcept.create(invalidFormatArgs);
  console.log("Output:", invalidFormatResult);
  assertEquals(invalidFormatResult.error, "Username and password must consist solely of alphabets, numbers, underscores, and hyphens.", "create should return error for invalid username format");

  const invalidPasswordFormatArgs = {
    username: "alice_valid",
    password: "Password@",
    profilePic: "http://example.com/invalid_pass.jpg",
    email: "invalid_pass@example.com",
  };
  console.log("Action: create (invalid password format)", invalidPasswordFormatArgs);
  const invalidPasswordFormatResult = await userConcept.create(invalidPasswordFormatArgs);
  console.log("Output:", invalidPasswordFormatResult);
  assertEquals(invalidPasswordFormatResult.error, "Username and password must consist solely of alphabets, numbers, underscores, and hyphens.", "create should return error for invalid password format");


  // Scenario 2: Create user with existing email
  const existingEmailArgs1 = {
    username: "bob_builder",
    password: "SecurePassword456",
    profilePic: "http://example.com/bob.jpg",
    email: "bob@example.com",
  };
  console.log("Action: create (first user)", existingEmailArgs1);
  const createBobResult = await userConcept.create(existingEmailArgs1);
  assertEquals(createBobResult.user, "string", "create should return a user ID for Bob");

  const existingEmailArgs2 = {
    username: "bob_clone",
    password: "AnotherPassword789",
    profilePic: "http://example.com/bob_clone.jpg",
    email: "bob@example.com", // Duplicate email
  };
  console.log("Action: create (duplicate email)", existingEmailArgs2);
  const existingEmailResult = await userConcept.create(existingEmailArgs2);
  console.log("Output:", existingEmailResult);
  assertEquals(existingEmailResult.error, "Email is already in use.", "create should return error for duplicate email");

  // Scenario 3: Delete a non-existent user
  const nonExistentUserId = "user:nonexistent" as ID;
  const deleteNonExistentArgs = { user: nonExistentUserId };
  console.log("Action: delete (non-existent user)", deleteNonExistentArgs);
  const deleteNonExistentResult = await userConcept.delete(deleteNonExistentArgs);
  console.log("Output:", deleteNonExistentResult);
  assertEquals(deleteNonExistentResult.error, "User not found.", "delete should return error for non-existent user");

  // Scenario 4: Change profile picture of a non-existent user
  const changePicNonExistentArgs = { user: nonExistentUserId, newProfilePic: "http://example.com/fake.jpg" };
  console.log("Action: changeProfilePic (non-existent user)", changePicNonExistentArgs);
  const changePicNonExistentResult = await userConcept.changeProfilePic(changePicNonExistentArgs);
  console.log("Output:", changePicNonExistentResult);
  assertEquals(changePicNonExistentResult.error, "User not found.", "changeProfilePic should return error for non-existent user");

  // Scenario 5: Retrieve details for a deleted user
  const bobUserId = createBobResult.user;
  await userConcept.delete({ user: bobUserId }); // Delete Bob
  const retrieveDeletedUserArgs = { userId: bobUserId };
  console.log("Query: _getUserById (deleted user)", retrieveDeletedUserArgs);
  const retrieveDeletedUserResult = await userConcept._getUserById(retrieveDeletedUserArgs);
  console.log("Output:", retrieveDeletedUserResult);
  assertEquals(retrieveDeletedUserResult.length, 0, "Querying for a deleted user should return empty");

  // Scenario 6: Get all users
  await userConcept.create({
    username: "charlie_chaplin",
    password: "PasswordXYZ",
    profilePic: "http://example.com/charlie.jpg",
    email: "charlie@example.com",
  });
  const getAllUsersResult = await userConcept._getAllUsers();
  console.log("Query: _getAllUsers");
  console.log("Output:", getAllUsersResult);
  assertEquals(getAllUsersResult.length, 2, "_getAllUsers should return all created users"); // Alice and Charlie

  await client.close();
});

Deno.test("UserConcept: Password Hashing Verification", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  console.log("\n--- Test: UserConcept Password Hashing Verification ---");

  const username = "hash_test_user";
  const password = "SuperSecurePassword123";
  const email = "hash_test@example.com";
  const profilePic = "http://example.com/hash.jpg";

  // Create user
  const createResult = await userConcept.create({ username, password, profilePic, email });
  const userId = createResult.user;

  // Retrieve user from DB to check password hash
  const userInDb = await db.collection("User.users").findOne({ _id: userId });
  console.log("User found in DB:", userInDb);

  // Verify that the stored password is a hash and not the plain password
  if (userInDb) {
    assertEquals(userInDb.passwordHash.startsWith("$2b$"), true, "Stored password should be a bcrypt hash");
    assertEquals(userInDb.passwordHash, await encryptPassword(password), "Stored hash should match the encrypted password");
    assertEquals(userInDb.passwordHash === password, false, "Stored password hash should not be the plain password");
  } else {
    throw new Error("User not found in DB after creation.");
  }

  await client.close();
});
```