---
timestamp: 'Thu Oct 16 2025 18:27:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_182746.bfb7c17c.md]]'
content_id: 6ce6e0cfcf3ef5c0a898f3002bb9647fceb8317f5032199bd0a65562e70f299e
---

# concept: OutputRender

* **concept**: OutputRender \[User]
* **purpose**: To generate media files with translated content overlaid.
* **principle**: If a user provides an imagePath and information about where to place translated text, then the system generates output versions of that image with the translations overlaid.
* **state**:
  * A set of `OutputVersion` objects with
    * `imagePath`: String
    * `renderedData`: `RenderedContent`
  * A `RenderedContent` object with
    * `textElements`: A list of `TextElement` objects.
  * A `TextElement` object with
    * `text`: String
    * `position`: A `Position` object.
    * `fontSize`: String (Optional)
    * `color`: String (Optional)
    * (other rendering properties)
  * A `Position` object with
    * `x`: Integer
    * `y`: Integer
    * `x2`: Integer
    * `y2`: Integer
* **actions**:
  * `render (imagePath: String, contentToRender: RenderedContent): (output: OutputVersion)`
    * **requires**: `imagePath` exists. `contentToRender` contains valid rendering instructions, such as valid color, positive font size, non-negative positions.
    * **effects**: Creates a new `OutputVersion` by overlaying the `contentToRender` onto the file at `imagePath`. The `contentToRender` provides all necessary information for positioning and styling.
  * `export (output: OutputVersion, destination: String, type: String): (file: File)`
    * **requires**: `output` exists. `destination` is a valid path on the user's device. `type` is a supported export format.
    * **effects**: Saves or downloads the `output` media file to the specified `destination` in the chosen `type`.
