---
timestamp: 'Sun Oct 19 2025 23:30:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_233030.3b904eed.md]]'
content_id: df96e893af513a11f8c5b9067ce43ffa25aec4db63351499009331d6ee9f9405
---

# concept: OutputRender

* **concept**: OutputRender
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
