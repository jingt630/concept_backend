# prompt

# User Concept Specification

**concept** User \[User]

**purpose** To allow individuals to create and manage their own personal data within the system, ensuring privacy by preventing sharing or visibility with other users.

**principle** If a user registers with a unique email, their account is created in the system, storing their associated data; later, if the user chooses, their account and associated data can be deleted.

**state**
  a set of Users with
    username String
    password String  // Stored in a way that ensures uniqueness and is not directly readable for security.
    profilePic Image
    email String
    dateCreated DateTime

**actions**

  **create** (username: String, password: String, profilePic: Image, email: String): (user: User)
    **requires**
      username and password must be made of alphabets,numbers,underscore and hyphen only
      email is not already in use by any existing User
    **effects**
      creates a new User entity
      sets username to input username
      sets password to a securely hashed representation of the input password
      sets profilePic to input profilePic
      sets email to input email
      sets dateCreated to the current DateTime
      returns the identifier of the newly created User

  **delete** (user: User)
    **requires**
      user exists in the set of Users
    **effects**
      removes the specified User entity and all associated data from the system

  **changeProfilePic** (user: User, newProfilePic: Image)
    **requires**
      user exists in the set of Users
    **effects**
      sets the profilePic of the specified User to newProfilePic

format markdown to be like this:

# Revised Concept 1: MediaManagement (Focusing on Clarity and Addressing Feedback)

**Concept:** MediaManagement\[Users]

**Purpose:** Cloud storage and organization of image files for a *single user*. [^3] This concept manages the lifecycle of uploaded image files, including their metadata and associations with processing results.

**Principle:** User can upload a media file with its type to a filePath in the system. The file can be deleted, moved to other folders only by the owner. When the file gets translated, the context the AI learned from it will also be associated with the media.

**State**

A set of `MediaFile` with:
*   `id` (String): A unique identifier for the media file.
*   `filename` (String): The original name of the uploaded file.
*   `filePath` (String): The path within local storage where the file is located.
*   `mediaType` (String): e.g., "png", "jpg", "webp".
*   `cloudURL` (String): The path in the cloud storage that represents this MediaFile.
*   `uploadDate` (Timestamp): When the file was uploaded.
*   `updateDate` (Timestamp): The last time this `MediaFile`'s metadata was updated.
*   `context?` (Optional[String]): A reference (dictionary of string:string) to the result of text extraction for this media. It's optional because it's populated *after* upload and extraction.
*   `translatedText?` (Optional[String]): A rendered translated versions of the context (also dictionary of string:string). It's optional initially and populated as rendering occurs.

**Actions**

*   `upload( filePath: String, mediaType: String, filename: String, relativePath: String): MediaFile`
    *   **Require:** `filename` is alphabets and numbers and space only. `filePath` specifies a valid path within the app's managed storage. `relativePath` is a valid pathway on the user's computer and has the `mediaType`.
    *   **Effect:**
        *   Creates a new `MediaFile` object with a unique `id`, the provided `filename`, `filePath` (inside the app folder in the user's computer), `mediaType`, `uploadDate`, and initiate `updateDate` as the same date the file is uploaded.
        *   Initializes `context` to `None` and `translatedVersions` to `None`.
        *   The owner of the MedialFile is user.
        *   Returns the newly created `MediaFile`.

*   `delete(mediaId: String)`
    *   **Require:** `mediaId` corresponds to an existing `MediaFile`
    *   **Effect:**
        *   Removes the `MediaFile` object from system and so user is not the owner of it anymore.

*   `move(mediaId: String, newFilePath: String)`
    *   **Require:** `mediaId` exists. `newRelativePath` specifies a valid pathway within the storage workspace for the user.
    *   **Effect:**
        *   Updates the `filePath` of the `MediaFile` object corresponding to `mediaId` to reflect the new location.Physically moves the file data in app storage.[^1]

[^1:] App storage is within the user's local storage. The cloudURL doesn't change, so still same spot in the cloud. User is not allowed to touch the cloud anyway.

*   `createFolder(filePath: String, name: String)`
    *   **Require:** `filePath` is valid. `name` is unique within the folder the `filePath`.
    *   **Effect:** Creates a new folder structure within the app's managed storage.

*   `updateContext(mediaId: String, extractionResult: Dictionary[String:String])`
    *   **Require:** `mediaId` exists. `extractionResult` is a valid structured Dictionary of string to string that provides information about the text in the mediafile with mediaId. [^2]
    *   **Effect:** Updates the `context` field of the `MediaFile` corresponding to `mediaId` with the provided `extractionResult`.
    If context field doesn't exist, create one and updates with extractionResult.

*   `addTranslatedText(mediaId: String, translatedText: Dictionary[String:String])`
    *   **Require:** `mediaId` exists. `translatedText` is a valid structured Dictionary of string to string that provides information about the text in the mediafile with mediaId.[^2]
    *   **Effect:** Appends the `outputVersion` to the `translatedVersions` list of the `MediaFile` corresponding to `mediaId`.
[^2:] These two actions aren't accessible by users, they are meant to be called by the app only, and so the translatedText or extractionResult given always corresponds to the media identified by mediaId.

[^3:] It's never possible for the user have any interaction with other users of the application. The database only stores the most recent version of an editable MediaFile through a cloudURL. The computer can only access the MediaFile stored
in the cloudURL. No worry of other computers accessing the same MediaFile.


# response:

# User (User Management)

**Concept:** User \[User]

**Purpose:** To enable individuals to create and manage their personal data within the system, ensuring privacy by preventing data sharing or visibility with other users.

**Principle:** A user can register with a unique email, which creates their account and stores their associated data. Later, if the user chooses, their account and associated data can be deleted.

**State**

A set of `User` with:

*   `username` (String): The user's chosen username.
*   `password` (String): A securely hashed representation of the user's password, ensuring uniqueness and non-readability.
*   `profilePic` (Image): The user's profile picture.
*   `email` (String): The user's unique email address.
*   `dateCreated` (DateTime): The date and time when the user account was created.

**Actions**

*   `create(username: String, password: String, profilePic: Image, email: String): User`
    *   **Requires:**
        *   `username` and `password` must consist solely of alphabets, numbers, underscores, and hyphens.
        *   `email` must not be in use by any existing `User`.
    *   **Effects:**
        *   Creates a new `User` entity.
        *   Sets `username` to the input `username`.
        *   Sets `password` to a securely hashed representation of the input `password`.
        *   Sets `profilePic` to the input `profilePic`.
        *   Sets `email` to the input `email`.
        *   Sets `dateCreated` to the current `DateTime`.
        *   Returns the identifier of the newly created `User`.

*   `delete(user: User)`
    *   **Requires:** `user` must exist in the set of `Users`.
    *   **Effects:**
        *   Removes the specified `User` entity and all associated data from the system.

*   `changeProfilePic(user: User, newProfilePic: Image)`
    *   **Requires:** `user` must exist in the set of `Users`.
    *   **Effects:**
        *   Sets the `profilePic` of the specified `User` to `newProfilePic`.