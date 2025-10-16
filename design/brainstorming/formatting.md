# prompt
# Concept: `OutputRender`

**Concept** `OutputRender`

**Purpose** To generate media files with translated content overlaid.

**Principle** Given an imagePath and information about where to place translated text, the system generates output versions.

**State**

A set of `OutputVersion` objects. An `OutputVersion` is defined as:

```
OutputVersion {
  imagePath: String
  renderedData: RenderedContent
}
```

Where `RenderedContent` is a structured representation of the translated text and its placement information, *independent* of the `Translation` or `ExtractionResult` concepts themselves. `RenderedContent` could look like this:

```
RenderedContent {
  // A list of text elements to render
  textElements: [
    {
      text: String,          // The translated text
      position: { x: Integer, y: Integer, x2: Integer, y2: Integer }, // Bounding box for placement
      font-size: String,          // Optional: Font details
      color: String,         // Optional: Text color
      // ... other rendering properties
    }
  ]
}
```

**Actions**

`render(imagePath:String, contentToRender: RenderedContent): (output: OutputVersion)`
**require:** `imagePath` exists, `contentToRender` contains valid rendering instructions, such as valid color, positive font size, non-negative positions
**effect:** Creates a new `OutputVersion` by overlaying the `contentToRender` onto the file at `imagePath`. The `contentToRender` provides all necessary information for positioning and styling.

`export(output: OutputVersion, destination: String, type: String): (file: File)`
**require:** `output` exists, `destination` is a valid path on the user's device, `type` is a supported export format.
**effect:** Saves or downloads the `output` media file to the specified `destination` in the chosen `type`.


format the translation concept into the same format as the likertsurvey format

# concept: LikertSurvey

* **concept**: LikertSurvey \[Author, Respondent]
* **purpose**: To measure attitudes or opinions by asking respondents to rate their level of agreement with a series of statements on a predefined scale.
* **principle**: If an author creates a survey with several questions on a 1-5 scale, and a respondent submits their answers to those questions, then the author can view the collected responses to analyze the respondent's opinions.
* **state**:
  * A set of `Surveys` with
    * an `author` of type `Author`
    * a `title` of type `String`
    * a `scaleMin` of type `Number`
    * a `scaleMax` of type `Number`
  * A set of `Questions` with
    * a `survey` of type `Survey`
    * a `text` of type `String`
  * A set of `Responses` with
    * a `respondent` of type `Respondent`
    * a `question` of type `Question`
    * a `value` of type `Number`
* **actions**:
  * `createSurvey (author: Author, title: String, scaleMin: Number, scaleMax: Number): (survey: Survey)`
    * **requires**: `scaleMin < scaleMax`
    * **effects**: Creates a new survey with the given author, title, and scale.
  * `addQuestion (survey: Survey, text: String): (question: Question)`
    * **requires**: The survey must exist.
    * **effects**: Adds a new question to the specified survey.
  * `submitResponse (respondent: Respondent, question: Question, value: Number)`
    * **requires**: The question must exist. The respondent must not have already submitted a response for this question. The value must be within the survey's scale.
    * **effects**: Records the respondent's answer for the given question.
  * `updateResponse (respondent: Respondent, question: Question, value: Number)`
    * **requires**: The question must exist. The respondent must have already submitted a response for this question. The value must be within the survey's scale.
    * **effects**: Updates the respondent's existing answer for the given question.

# response:

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