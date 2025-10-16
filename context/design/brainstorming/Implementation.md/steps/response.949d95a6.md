---
timestamp: 'Thu Oct 16 2025 18:32:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_183205.1c9bd511.md]]'
content_id: 949d95a629afbf7dda143facba872bbe56ed15454afcc94092beef665c524a9f
---

# response:

```python
import uuid
import os
import shutil
from datetime import datetime
from abc import ABC, abstractmethod
from typing import Dict, List, Optional

# --- Error Handling ---

class MediaManagementError(Exception):
    """Base exception for MediaManagement operations."""
    pass

class MediaFileNotFoundError(MediaManagementError):
    """Raised when a MediaFile is not found."""
    pass

class InvalidInputError(MediaManagementError):
    """Raised for invalid input parameters."""
    pass

# --- Core Data Structure ---

class MediaFile:
    """
    Represents a single media file managed by the MediaManagement system.
    """
    def __init__(self,
                 filename: str,
                 media_type: str,
                 relative_path_in_app: str, # Path *within* the app's managed storage
                 original_upload_path: str, # User's original path for reference
                 ):
        """
        Initializes a MediaFile object.

        Args:
            filename (str): The desired filename for the file within the system.
            media_type (str): The type of media (e.g., "png", "jpg", "webp").
            relative_path_in_app (str): The path within the application's managed storage.
            original_upload_path (str): The original path on the user's computer where the file was uploaded from.
        """
        self.id: str = str(uuid.uuid4())
        self.filename: str = filename
        self.media_type: str = media_type
        self.relative_path_in_app: str = relative_path_in_app
        self.original_upload_path: str = original_upload_path
        self.upload_date: datetime = datetime.now()
        self.update_date: datetime = self.upload_date
        self.context: Optional[Dict[str, str]] = None
        self.translated_text: Optional[Dict[str, str]] = None # Represents a single translated version

    def update_metadata_timestamp(self):
        """Updates the update_date to the current time."""
        self.update_date = datetime.now()

    def __repr__(self):
        return (f"MediaFile(id='{self.id[:8]}...', filename='{self.filename}', "
                f"media_type='{self.media_type}', "
                f"relative_path_in_app='{self.relative_path_in_app}', "
                f"upload_date='{self.upload_date}', update_date='{self.update_date}', "
                f"context={'Yes' if self.context else 'No'}, "
                f"translated_text={'Yes' if self.translated_text else 'No'})")

    def to_dict(self) -> Dict:
        """Converts the MediaFile object to a dictionary for serialization/storage."""
        return {
            "id": self.id,
            "filename": self.filename,
            "media_type": self.media_type,
            "relative_path_in_app": self.relative_path_in_app,
            "original_upload_path": self.original_upload_path,
            "upload_date": self.upload_date.isoformat(),
            "update_date": self.update_date.isoformat(),
            "context": self.context,
            "translated_text": self.translated_text,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'MediaFile':
        """Creates a MediaFile object from a dictionary."""
        media_file = cls(
            filename=data["filename"],
            media_type=data["media_type"],
            relative_path_in_app=data["relative_path_in_app"],
            original_upload_path=data["original_upload_path"]
        )
        media_file.id = data["id"]
        media_file.upload_date = datetime.fromisoformat(data["upload_date"])
        media_file.update_date = datetime.fromisoformat(data["update_date"])
        media_file.context = data.get("context")
        media_file.translated_text = data.get("translated_text")
        return media_file

# --- Storage Abstraction ---

class StorageService(ABC):
    """
    Abstract base class for file storage operations.
    This ensures modularity and allows for different storage backends (e.g., local filesystem, cloud).
    """
    @abstractmethod
    def create_file(self, destination_path: str, file_content: bytes):
        """Creates a file at the given destination path with the provided content."""
        pass

    @abstractmethod
    def read_file(self, file_path: str) -> bytes:
        """Reads the content of a file at the given path."""
        pass

    @abstractmethod
    def delete_file(self, file_path: str):
        """Deletes the file at the given path."""
        pass

    @abstractmethod
    def move_file(self, source_path: str, destination_path: str):
        """Moves a file from source_path to destination_path."""
        pass

    @abstractmethod
    def create_directory(self, directory_path: str):
        """Creates a directory at the given path."""
        pass

    @abstractmethod
    def file_exists(self, file_path: str) -> bool:
        """Checks if a file exists at the given path."""
        pass

    @abstractmethod
    def directory_exists(self, directory_path: str) -> bool:
        """Checks if a directory exists at the given path."""
        pass

    @abstractmethod
    def list_directory(self, directory_path: str) -> List[str]:
        """Lists the contents of a directory."""
        pass

    @abstractmethod
    def get_file_size(self, file_path: str) -> int:
        """Gets the size of a file."""
        pass

    @abstractmethod
    def get_file_creation_time(self, file_path: str) -> datetime:
        """Gets the creation time of a file."""
        pass

    @abstractmethod
    def get_file_modification_time(self, file_path: str) -> datetime:
        """Gets the modification time of a file."""
        pass

class LocalStorageService(StorageService):
    """
    Implementation of StorageService for the local file system.
    """
    def __init__(self, base_storage_dir: str):
        """
        Initializes the LocalStorageService.

        Args:
            base_storage_dir (str): The root directory where the application will store media files.
        """
        self.base_storage_dir = os.path.abspath(base_storage_dir)
        self.create_directory(self.base_storage_dir) # Ensure base directory exists

    def _resolve_path(self, relative_path: str) -> str:
        """Resolves a given relative path against the base storage directory."""
        # Ensure we don't resolve paths outside the base_storage_dir for security
        resolved = os.path.abspath(os.path.join(self.base_storage_dir, relative_path))
        if not resolved.startswith(self.base_storage_dir):
            raise MediaManagementError(f"Attempted to access path outside of base storage directory: {relative_path}")
        return resolved

    def create_file(self, destination_path: str, file_content: bytes):
        full_path = self._resolve_path(destination_path)
        self.create_directory(os.path.dirname(full_path)) # Ensure parent directory exists
        with open(full_path, 'wb') as f:
            f.write(file_content)

    def read_file(self, file_path: str) -> bytes:
        full_path = self._resolve_path(file_path)
        if not self.file_exists(file_path):
            raise FileNotFoundError(f"File not found: {full_path}")
        with open(full_path, 'rb') as f:
            return f.read()

    def delete_file(self, file_path: str):
        full_path = self._resolve_path(file_path)
        if not self.file_exists(file_path):
            # It's okay if the file is already gone, just log a warning or ignore
            # raise FileNotFoundError(f"File not found: {full_path}")
            return
        os.remove(full_path)

    def move_file(self, source_relative_path: str, destination_relative_path: str):
        source_full_path = self._resolve_path(source_relative_path)
        destination_full_path = self._resolve_path(destination_relative_path)

        if not self.file_exists(source_relative_path):
            raise FileNotFoundError(f"Source file not found: {source_full_path}")

        self.create_directory(os.path.dirname(destination_full_path)) # Ensure parent directory exists
        shutil.move(source_full_path, destination_full_path)

    def create_directory(self, directory_path: str):
        full_path = self._resolve_path(directory_path)
        os.makedirs(full_path, exist_ok=True)

    def file_exists(self, file_path: str) -> bool:
        return os.path.isfile(self._resolve_path(file_path))

    def directory_exists(self, directory_path: str) -> bool:
        return os.path.isdir(self._resolve_path(directory_path))

    def list_directory(self, directory_path: str) -> List[str]:
        full_path = self._resolve_path(directory_path)
        if not self.directory_exists(directory_path):
            return []
        return os.listdir(full_path)

    def get_file_size(self, file_path: str) -> int:
        full_path = self._resolve_path(file_path)
        if not self.file_exists(file_path):
            raise FileNotFoundError(f"File not found: {full_path}")
        return os.path.getsize(full_path)

    def get_file_creation_time(self, file_path: str) -> datetime:
        full_path = self._resolve_path(file_path)
        if not self.file_exists(file_path):
            raise FileNotFoundError(f"File not found: {full_path}")
        return datetime.fromtimestamp(os.path.getctime(full_path))

    def get_file_modification_time(self, file_path: str) -> datetime:
        full_path = self._resolve_path(file_path)
        if not self.file_exists(file_path):
            raise FileNotFoundError(f"File not found: {full_path}")
        return datetime.fromtimestamp(os.path.getmtime(full_path))

# --- AI Abstraction ---

class AIContextExtractor(ABC):
    """
    Abstract base class for extracting context from media files.
    """
    @abstractmethod
    def extract_text_context(self, media_file_path: str) -> Dict[str, str]:
        """
        Extracts textual context from a given media file.

        Args:
            media_file_path (str): The full path to the media file.

        Returns:
            Dict[str, str]: A dictionary representing the extracted context.
        """
        pass

    @abstractmethod
    def translate_context(self, context: Dict[str, str], target_language: str = "en") -> Dict[str, str]:
        """
        Translates the extracted context.

        Args:
            context (Dict[str, str]): The context to translate.
            target_language (str): The language code to translate to (e.g., "en", "es").

        Returns:
            Dict[str, str]: A dictionary with the translated text.
        """
        pass

class DummyAIContextExtractor(AIContextExtractor):
    """
    A dummy implementation of AIContextExtractor for testing purposes.
    Simulates AI processing with delays.
    """
    def extract_text_context(self, media_file_path: str) -> Dict[str, str]:
        print(f"AI: Simulating text extraction from '{media_file_path}'...")
        # In a real scenario, this would involve image-to-text OCR
        filename = os.path.basename(media_file_path)
        return {
            "filename_origin": filename,
            "detected_language": "undetermined",
            "extracted_text": f"This is dummy text extracted from {filename}. Actual AI processing would happen here."
        }

    def translate_context(self, context: Dict[str, str], target_language: str = "en") -> Dict[str, str]:
        print(f"AI: Simulating translation of context to '{target_language}'...")
        translated_content = {}
        for key, value in context.items():
            translated_content[f"{key}_translated_{target_language}"] = f"Translated: {value} ({target_language})"
        return translated_content

# --- Media Management Service ---

class MediaManagement:
    """
    Manages the storage and organization of image files for a single, local user.
    Handles the lifecycle of uploaded image files, including their metadata and associations with processing results.
    """

    def __init__(self, base_storage_dir: str, storage_service: StorageService, ai_extractor: AIContextExtractor):
        """
        Initializes the MediaManagement system.

        Args:
            base_storage_dir (str): The root directory for the application's managed storage.
            storage_service (StorageService): An instance of a class implementing StorageService.
            ai_extractor (AIContextExtractor): An instance of a class implementing AIContextExtractor.
        """
        self.base_storage_dir = os.path.abspath(base_storage_dir)
        self.storage_service = storage_service
        self.ai_extractor = ai_extractor
        self.media_files: Dict[str, MediaFile] = {}  # In-memory store for MediaFile objects

        # Ensure base storage directory exists and is managed by the provided service
        self.storage_service.create_directory(self.base_storage_dir)

    # --- Helper Methods ---

    def _get_media_file_by_id(self, media_id: str) -> MediaFile:
        """Retrieves a MediaFile object by its ID, raising an error if not found."""
        media_file = self.media_files.get(media_id)
        if not media_file:
            raise MediaFileNotFoundError(f"Media file with ID '{media_id}' not found.")
        return media_file

    def _generate_app_internal_path(self, filename: str, sub_directory: str = "") -> str:
        """Generates a standardized internal path for storing files within the app's managed directory."""
        # Sanitize filename for safety, though the prompt specified constraints.
        # More robust sanitization might be needed in a real app.
        safe_filename = "".join(c for c in filename if c.isalnum() or c in (' ', '.', '_')).rstrip()
        if not safe_filename:
            safe_filename = f"media_{uuid.uuid4().hex[:8]}" # Fallback if filename becomes empty

        return os.path.join(sub_directory, safe_filename)

    def _validate_filename(self, filename: str):
        """Validates filename constraints. (alphabets, numbers, and space only)."""
        if not filename:
            raise InvalidInputError("Filename cannot be empty.")
        if not all(c.isalnum() or c.isspace() for c in filename):
            raise InvalidInputError("Filename can only contain alphabets, numbers, and spaces.")

    def _validate_upload_path(self, original_file_path: str, media_type: str):
        """Validates the original upload path and checks for media type consistency."""
        if not os.path.isfile(original_file_path):
            raise FileNotFoundError(f"Original file not found at: {original_file_path}")
        if not original_file_path.lower().endswith(f".{media_type.lower()}"):
            raise InvalidInputError(f"Original file path '{original_file_path}' does not match media type '{media_type}'.")

    def _validate_app_relative_path(self, relative_path: str, media_type: str):
        """Validates a relative path within the app's storage structure, including media type."""
        if not relative_path:
            raise InvalidInputError("Relative path cannot be empty.")
        if not relative_path.lower().endswith(f".{media_type.lower()}"):
            raise InvalidInputError(f"Relative path '{relative_path}' does not match media type '{media_type}'.")

    # --- Actions Implementation ---

    def upload(self, original_file_path: str, media_type: str, filename: str, relative_path_in_app: str = "") -> MediaFile:
        """
        Uploads a media file to the system.

        Args:
            original_file_path (str): The path on the user's computer to the file to upload.
            media_type (str): The type of media (e.g., "png", "jpg", "webp").
            filename (str): The desired filename for the file within the system.
            relative_path_in_app (str): The desired sub-directory within the app's managed storage.
                                        Defaults to the root of the app's managed storage.

        Returns:
            MediaFile: The newly created MediaFile object.

        Raises:
            InvalidInputError: If filename or relative_path_in_app are invalid.
            FileNotFoundError: If the original_file_path does not exist.
            MediaManagementError: For other storage or processing issues.
        """
        self._validate_filename(filename)
        self._validate_upload_path(original_file_path, media_type)

        # Generate the internal path within the app's managed storage
        # Ensure the target directory structure exists within the app's managed storage
        target_app_dir_path_in_app = os.path.dirname(relative_path_in_app)
        self.storage_service.create_directory(target_app_dir_path_in_app)

        # Construct the final destination path within the app's managed storage
        app_internal_filename_path = self._generate_app_internal_path(filename, target_app_dir_path_in_app)

        # Ensure the target file path doesn't already exist to avoid overwriting unintentionally
        if self.storage_service.file_exists(app_internal_filename_path):
            raise MediaManagementError(f"File with name '{filename}' already exists in '{target_app_dir_path_in_app}'.")

        try:
            with open(original_file_path, 'rb') as f:
                file_content = f.read()

            # Create the file in the application's managed storage
            self.storage_service.create_file(app_internal_filename_path, file_content)

            # Create the MediaFile object
            new_media_file = MediaFile(
                filename=filename,
                media_type=media_type,
                relative_path_in_app=app_internal_filename_path,
                original_upload_path=original_file_path # Store original path for reference
            )
            self.media_files[new_media_file.id] = new_media_file
            return new_media_file

        except Exception as e:
            # Clean up potentially created file if MediaFile object creation fails
            if self.storage_service.file_exists(app_internal_filename_path):
                self.storage_service.delete_file(app_internal_filename_path)
            raise MediaManagementError(f"Failed to upload file '{filename}': {e}") from e

    def delete(self, media_id: str):
        """
        Deletes a media file from the system.

        Args:
            media_id (str): The ID of the media file to delete.

        Raises:
            MediaFileNotFoundError: If the media_id does not correspond to an existing file.
        """
        media_file = self._get_media_file_by_id(media_id)

        try:
            # Delete the actual file from storage
            self.storage_service.delete_file(media_file.relative_path_in_app)
            # Remove the metadata from our in-memory store
            del self.media_files[media_id]
        except FileNotFoundError:
            # If file is already gone from storage but metadata exists, just remove metadata
            print(f"Warning: File '{media_file.relative_path_in_app}' not found in storage during delete, removing metadata only.")
            del self.media_files[media_id]
        except Exception as e:
            raise MediaManagementError(f"Failed to delete media file '{media_file.filename}' (ID: {media_id}): {e}") from e

    def move(self, media_id: str, new_relative_path_in_app: str):
        """
        Moves a media file to a new location within the app's managed storage.

        Args:
            media_id (str): The ID of the media file to move.
            new_relative_path_in_app (str): The new relative path within the app's managed storage.
                                            This should be the full path, including the filename.

        Raises:
            MediaFileNotFoundError: If the media_id does not correspond to an existing file.
            InvalidInputError: If the new_relative_path_in_app is invalid.
            MediaManagementError: For other storage or processing issues.
        """
        media_file = self._get_media_file_by_id(media_id)

        # Validate the new path structure
        if not new_relative_path_in_app:
            raise InvalidInputError("New relative path cannot be empty.")

        new_dir = os.path.dirname(new_relative_path_in_app)
        new_filename = os.path.basename(new_relative_path_in_app)

        # Ensure the new filename is valid and matches the media type
        self._validate_filename(new_filename)
        if not new_filename.lower().endswith(f".{media_file.media_type.lower()}"):
             raise InvalidInputError(f"New filename '{new_filename}' does not match media type '{media_file.media_type}'.")

        # Ensure the target directory for the move exists
        self.storage_service.create_directory(new_dir)

        # Check if the destination file already exists
        if self.storage_service.file_exists(new_relative_path_in_app):
            raise MediaManagementError(f"File already exists at the destination path: '{new_relative_path_in_app}'.")

        try:
            # Move the file data in app storage
            self.storage_service.move_file(media_file.relative_path_in_app, new_relative_path_in_app)

            # Update the MediaFile object's path and timestamp
            media_file.relative_path_in_app = new_relative_path_in_app
            media_file.update_metadata_timestamp()
            # Optionally update original_upload_path to reflect the new location in app storage if desired
            # media_file.original_upload_path = self.storage_service._resolve_path(new_relative_path_in_app)
        except Exception as e:
            raise MediaManagementError(f"Failed to move media file '{media_file.filename}' (ID: {media_id}) to '{new_relative_path_in_app}': {e}") from e

    def create_folder(self, parent_directory_path: str, name: str):
        """
        Creates a new folder within the app's managed storage.

        Args:
            parent_directory_path (str): The relative path of the parent folder where the new folder will be created.
                                         Can be "" for the root of the app's managed storage.
            name (str): The name of the new folder to create.

        Raises:
            InvalidInputError: If the folder name is invalid or if parent path is invalid.
            MediaManagementError: If the folder already exists or for other storage issues.
        """
        if not name:
            raise InvalidInputError("Folder name cannot be empty.")
        # Basic validation for folder name (can be extended)
        if not all(c.isalnum() or c in (' ', '_', '-') for c in name):
            raise InvalidInputError("Folder name can only contain alphanumeric characters, spaces, underscores, and hyphens.")

        # Construct the full relative path for the new folder
        new_folder_relative_path = os.path.join(parent_directory_path, name)

        try:
            # Use the storage service to create the directory
            self.storage_service.create_directory(new_folder_relative_path)
            print(f"Folder '{name}' created successfully in '{parent_directory_path}'.")
        except FileExistsError:
            raise MediaManagementError(f"Folder '{name}' already exists in '{parent_directory_path}'.")
        except Exception as e:
            raise MediaManagementError(f"Failed to create folder '{name}' in '{parent_directory_path}': {e}") from e

    def update_context(self, media_id: str, extraction_result: Dict[str, str]):
        """
        Updates the AI-extracted context for a media file.
        This action is intended to be called by the application, not directly by the user.

        Args:
            media_id (str): The ID of the media file.
            extraction_result (Dict[str, str]): The dictionary of extracted text information.

        Raises:
            MediaFileNotFoundError: If the media_id does not correspond to an existing file.
            InvalidInputError: If extraction_result is not a valid dictionary.
        """
        media_file = self._get_media_file_by_id(media_id)

        if not isinstance(extraction_result, dict):
            raise InvalidInputError("extraction_result must be a dictionary.")
        # More specific validation for dictionary content could be added here if needed.

        try:
            # Optionally, you could re-verify extraction with AI here if needed for robustness.
            # For this implementation, we trust the provided result.

            media_file.context = extraction_result
            media_file.update_metadata_timestamp()
        except Exception as e:
            raise MediaManagementError(f"Failed to update context for media file ID '{media_id}': {e}") from e

    def add_translated_text(self, media_id: str, translated_text: Dict[str, str]):
        """
        Adds translated text for a media file's context.
        This action is intended to be called by the application, not directly by the user.
        Note: The concept specified 'translatedText?' (Optional[String]) initially, then clarified as
        a dictionary of string:string. This implementation assumes a single translation dictionary
        is set or updated. If multiple distinct translations were required, the `MediaFile.translated_text`
        structure would need to change (e.g., to `Dict[str, Dict[str, str]]` where the key is language code).

        Args:
            media_id (str): The ID of the media file.
            translated_text (Dict[str, str]): The dictionary of translated text.

        Raises:
            MediaFileNotFoundError: If the media_id does not correspond to an existing file.
            InvalidInputError: If translated_text is not a valid dictionary.
        """
        media_file = self._get_media_file_by_id(media_id)

        if not isinstance(translated_text, dict):
            raise InvalidInputError("translated_text must be a dictionary.")
        # More specific validation for dictionary content could be added here if needed.

        try:
            media_file.translated_text = translated_text
            media_file.update_metadata_timestamp()
        except Exception as e:
            raise MediaManagementError(f"Failed to add translated text for media file ID '{media_id}': {e}") from e

    # --- Helper methods for AI integration ---
    def process_media_for_ai(self, media_id: str, target_language: str = "en") -> Dict[str, str]:
        """
        Orchestrates AI processing (extraction and translation) for a given media file.
        This method is an example of how the app might use the AI extractor.

        Args:
            media_id (str): The ID of the media file to process.
            target_language (str): The language to translate the context into.

        Returns:
            Dict[str, str]: The combined extraction and translation result.

        Raises:
            MediaFileNotFoundError: If the media_id does not correspond to an existing file.
            MediaManagementError: If AI processing fails.
        """
        media_file = self._get_media_file_by_id(media_id)
        file_path_on_disk = self.storage_service._resolve_path(media_file.relative_path_in_app)

        try:
            # 1. Extract context
            extraction_result = self.ai_extractor.extract_text_context(file_path_on_disk)
            self.update_context(media_id, extraction_result) # Update context in our system

            # 2. Translate context
            translated_result = self.ai_extractor.translate_context(extraction_result, target_language)
            self.add_translated_text(media_id, translated_result) # Add translated text to our system

            # Return a combined result for potential display or further use
            return {**extraction_result, **translated_result}

        except Exception as e:
            raise MediaManagementError(f"AI processing failed for media ID '{media_id}': {e}") from e

    # --- Methods to retrieve data ---

    def get_media_file(self, media_id: str) -> MediaFile:
        """Returns a MediaFile object by its ID."""
        return self._get_media_file_by_id(media_id)

    def list_all_media_files(self) -> List[MediaFile]:
        """Returns a list of all managed MediaFile objects."""
        return list(self.media_files.values())

    def list_media_files_in_directory(self, relative_directory_path: str) -> List[MediaFile]:
        """Lists MediaFile objects residing in a specific directory within app storage."""
        # Normalize the directory path to ensure consistent comparison
        normalized_dir_path = os.path.normpath(relative_directory_path)
        if normalized_dir_path and not self.storage_service.directory_exists(normalized_dir_path):
            return [] # Return empty list if directory doesn't exist

        found_files = []
        for media_file in self.media_files.values():
            # Check if the media file's path is directly within or is a subdirectory of the requested directory.
            # We need to consider paths like "parent/child/file.jpg" when listing "parent/child"
            # or "parent/file.jpg" when listing "parent".
            media_file_dir = os.path.dirname(media_file.relative_path_in_app)
            
            # Ensure both paths are normalized for reliable comparison
            normalized_media_file_dir = os.path.normpath(media_file_dir)

            if normalized_media_file_dir == normalized_dir_path:
                found_files.append(media_file)
            elif normalized_dir_path and normalized_media_file_dir.startswith(os.path.normpath(f"{normalized_dir_path}/")):
                # This condition handles files in subdirectories.
                # We append a slash to ensure we only match directories nested *within* the requested path.
                found_files.append(media_file)
            elif not normalized_dir_path: # If listing root directory
                 found_files.append(media_file)

        return found_files
    
    def get_all_media_metadata(self) -> List[Dict]:
        """Returns metadata for all managed media files."""
        return [mf.to_dict() for mf in self.media_files.values()]

    def get_media_metadata(self, media_id: str) -> Dict:
        """Returns metadata for a specific media file."""
        return self._get_media_file_by_id(media_id).to_dict()

# --- Example Usage ---

if __name__ == "__main__":
    import tempfile
    import time

    # --- Setup ---
    # Create a temporary directory for the application's managed storage
    temp_app_storage = tempfile.mkdtemp(prefix="media_app_storage_")
    print(f"App storage base directory: {temp_app_storage}")

    # Instantiate the storage service
    local_storage_service = LocalStorageService(base_storage_dir=temp_app_storage)

    # Instantiate the AI extractor
    ai_extractor = DummyAIContextExtractor()

    # Instantiate the MediaManagement system
    media_manager = MediaManagement(
        base_storage_dir=temp_app_storage,
        storage_service=local_storage_service,
        ai_extractor=ai_extractor
    )

    # Create dummy image file for testing
    temp_host_dir = tempfile.mkdtemp(prefix="host_files_")
    dummy_image_content = b"fake image data for testing"
    dummy_image_filename = "my_cool_photo.jpg"
    dummy_image_path_on_host = os.path.join(temp_host_dir, dummy_image_filename)
    with open(dummy_image_path_on_host, "wb") as f:
        f.write(dummy_image_content)

    # Create dummy document file for testing
    dummy_document_content = b"This is a sample report document."
    dummy_document_filename = "annual_report.txt"
    dummy_document_path_on_host = os.path.join(temp_host_dir, dummy_document_filename)
    with open(dummy_document_path_on_host, "wb") as f:
        f.write(dummy_document_content)

    # --- Operations ---

    print("\n--- Creating Folders ---")
    media_manager.create_folder("", "user_photos")
    media_manager.create_folder("user_photos", "vacation")
    media_manager.create_folder("user_photos", "portraits")
    media_manager.create_folder("documents", "reports") # Will create 'documents' folder too

    print("\n--- Uploading Media ---")
    try:
        uploaded_media_photo = media_manager.upload(
            original_file_path=dummy_image_path_on_host,
            media_type="jpg",
            filename="my_holiday_snap.jpg", # User-friendly filename
            relative_path_in_app="user_photos/vacation/my_holiday_snap.jpg" # Full path
        )
        print(f"Uploaded photo: {uploaded_media_photo}")

        uploaded_document = media_manager.upload(
            original_file_path=dummy_document_path_on_host,
            media_type="txt",
            filename="latest_report.txt",
            relative_path_in_app="documents/reports/latest_report.txt"
        )
        print(f"Uploaded document: {uploaded_document}")

        # Example of invalid upload
        try:
            media_manager.upload(
                original_file_path=dummy_image_path_on_host,
                media_type="png", # Mismatched media type
                filename="mismatched.png",
                relative_path_in_app="user_photos/mismatched.png"
            )
        except InvalidInputError as e:
            print(f"Caught expected error for invalid upload path: {e}")

    except Exception as e:
        print(f"An error occurred during upload: {e}")

    print("\n--- Listing Media ---")
    print("All media files:")
    for mf in media_manager.list_all_media_files():
        print(f"- {mf}")

    print("\nMedia files in 'user_photos/vacation':")
    for mf in media_manager.list_media_files_in_directory("user_photos/vacation"):
        print(f"- {mf}")

    print("\nMedia files in 'user_photos': (should include vacation and portraits items if any)")
    for mf in media_manager.list_media_files_in_directory("user_photos"):
        print(f"- {mf}")

    print("\nMetadata for all files:")
    for md in media_manager.get_all_media_metadata():
        print(f"- {md['filename']}: {md['id']}")

    print("\n--- Moving Media ---")
    try:
        media_to_move_id = uploaded_media_photo.id
        new_photo_location = "user_photos/portraits/holiday_favorite.jpg"
        media_manager.move(media_to_move_id, new_photo_location)
        moved_media = media_manager.get_media_file(media_to_move_id)
        print(f"Moved photo: {moved_media}")

        # Verify listing in old and new locations
        print("Media files in 'user_photos/vacation' after move:")
        for mf in media_manager.list_media_files_in_directory("user_photos/vacation"):
            print(f"- {mf}")
        print(f"Media files in '{os.path.dirname(new_photo_location)}' after move:")
        for mf in media_manager.list_media_files_in_directory(os.path.dirname(new_photo_location)):
            print(f"- {mf}")

    except Exception as e:
        print(f"An error occurred during move: {e}")

    print("\n--- Processing Media with AI ---")
    try:
        # Get the document ID for AI processing
        document_to_process_id = None
        for mf in media_manager.list_all_media_files():
            if mf.filename == "latest_report.txt":
                document_to_process_id = mf.id
                break

        if document_to_process_id:
            print(f"Processing document '{media_manager.get_media_file(document_to_process_id).filename}' (ID: {document_to_process_id})...")
            ai_results = media_manager.process_media_for_ai(document_to_process_id, target_language="es")
            print("AI Processing Results:")
            for key, value in ai_results.items():
                print(f"  {key}: {value}")

            # Verify updated context and translated text
            processed_media = media_manager.get_media_file(document_to_process_id)
            print(f"\nMedia file after AI processing: {processed_media}")
            print(f"Context: {processed_media.context}")
            print(f"Translated Text: {processed_media.translated_text}")
        else:
            print("Could not find the document to process.")

    except Exception as e:
        print(f"An error occurred during AI processing: {e}")

    print("\n--- Deleting Media ---")
    try:
        # Get the ID of the photo to delete (now in 'portraits' folder)
        photo_to_delete_id = None
        for mf in media_manager.list_all_media_files():
            if mf.filename == "holiday_favorite.jpg":
                photo_to_delete_id = mf.id
                break

        if photo_to_delete_id:
            print(f"Deleting photo '{media_manager.get_media_file(photo_to_delete_id).filename}' (ID: {photo_to_delete_id})...")
            media_manager.delete(photo_to_delete_id)
            print("Photo deleted successfully.")
        else:
            print("Could not find the photo to delete.")

        print("\nAll media files after deletion:")
        for mf in media_manager.list_all_media_files():
            print(f"- {mf}")

        # Try deleting a non-existent file
        try:
            media_manager.delete("non-existent-id")
        except MediaFileNotFoundError as e:
            print(f"Caught expected error for deleting non-existent file: {e}")

    except Exception as e:
        print(f"An error occurred during deletion: {e}")

    print("\n--- Cleanup ---")
    # Clean up the temporary directories
    try:
        shutil.rmtree(temp_app_storage)
        shutil.rmtree(temp_host_dir)
        print("Temporary directories cleaned up.")
    except Exception as e:
        print(f"Error during cleanup: {e}")
```
