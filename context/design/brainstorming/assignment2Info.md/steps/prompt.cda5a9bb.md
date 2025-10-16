---
timestamp: 'Thu Oct 16 2025 04:02:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_040224.c685b056.md]]'
content_id: cda5a9bb300d53f27cc4032a325810e72937682d887935b561c894d7580144b7
---

# prompt: # Assignment 2

*By media I mean like images, scanned paper, video, or voice recording. Not like music or 3d art.*

## Problem statement

### Problem Domain: Foreign Country Media Consumption

With the internet and streaming services these days, people can watch videos in different language from different countries. I'm into different medias produced by different countries, like c-drama,kpop, thai drama, japan shows, manga, and anime. Due to copyrights, legal matters, or just promotional means, media resources are hard to acquire and understand if you don't know the language or the culture of the country. I often have to turn on vpns and browse through different websites/platforms to find those media resources.

### Key Problem: Barrier of Seamless Access to Foregin Media

Users who want to enjoy media in another language face significant barriers: accurate translation isn’t just about words, but also requires editing, redrawing, and reformatting. This whole process take hours and at least a small team of people for one episode/chapter. This make foreign media feel inaccessible within a short time.

### Stakeholder List

* translating team members: People who are re-editing and translating the medias.

* Foregin Media Consumers: The viewers of translated media, also can be the demander for translated media.

* Original content creator: The creator of the media that is to be translated.

* Owners of the media: Could possibly be the company and/or creator of the media, who profit off of the media

### Evidence and comparables

* [AI help with translating medias](https://superagi.com/from-hours-to-minutes-mastering-efficient-video-subtitling-with-ai-powered-tools-and-techniques/)An comparable attempt for transcripting and translating with AI-powered tools. AI tools help with formatting and styling subtitiles and saves time. Plenty of media consumers prefer to watch videos in their native languages making subtitles important.

* [Diverse Language Media Consumption](https://www.gwi.com/blog/foreign-language-media) Almost of US media consumers are in favor of watch foreign language medias, and such medias are also gaining recognition globally. This shows the potential of faster and more often localization/translation needed for the demand.

* [Challenge of Machine Translation](https://www.sciencedirect.com/science/article/pii/S2589004224021035?utm_source=chatgpt.com) Machine translation often struggles with idiomatic expressions, metaphors, humor, and other culturally specific elements, as their meaning may not be directly translatable. Not to mention our problem includes text recognition from images.

* [Languages used on the internet](https://en.wikipedia.org/wiki/Languages_used_on_the_Internet) English is the most used language on the internet, but besides that, other languages only takes less than 6% each. There's still plenty of space for localization or translation needed when internet users are browsing through medias.

* [Existence of Scalation](https://whatismanga.wordpress.com/2019/04/12/43-why-do-scanlations-persist/) Scalation, a somewhat comparable, still exist due to there always being a demand for quicker translation. Official translation are not keeping up with the pace of the demand of the consumers.

* **Own Experience of Waiting** My own experience is I usually have to wait a day or two after the company posted their newest Japanese drama online to be able to watch it. The translation team removes the subtitles of the original video, subtitle it in two language (the original and English), and includes side notes on the screen for any language/culture specific jokes/sayings. This kind of speed is for digital media only. For physical medias like mangas I want to read, it's usually a month later to find an entire volume translated.

## Application Pitch

**TEPKonjac**

**Motivation:** Translate the media accurately and re-edit it to reflect on subtitles or text with AI.

**Key Features**

1. Media Upload - Users can freely upload their media into the the app.
   *Why it helps:* makes it easy and free for the users to use, people can just drop the file they want to be translated
   *Impact* Consumers get a simple, one-stop workflow, while translation teams save time gathering and preparing files into formats other applications might require one to be in.

2. Smart Translate & Localize - The app automatically recognizes text/speech, translates it with cultural/context awareness within the media and other context clues from medias of the same folder, and overlays the translation back into the media.
   *Why it helps:* Instead of inaccurate and messy subtitles/text, users get clean, natural translations that preserve the feel of the original work. We also don't want AI to relearn all the context again when new content is out for translation.
   *Impact:* Viewers can immediately understand foreign media. The creators’ intent is preserved, and offering different language versions can help gain potential audiences around the world. With more audiences, owners of the media can benefit and earn more. Translators spend less time viewing the media, translating, localizing, and editing.

3. Quick Edit Mode - Users can tweak translations, adjust font styles, or re-time subtitles through a simple editor after the media got processed by the app.
   *Why it helps:* Even if AI makes mistakes, users can polish results without starting from scratch.
   *Impact:* Reduces the workload of professional or volunteer translators, while ensuring consumers get polished and accurate results faster.

<!--
THE FOLLOWING ARE CONCEPTS NOT FEATURES
1. Can recognize different kinds of text font or the speech in the media
2. Translate with context clues
-->

## Concept Design

### Concept 1

**Concept:** MediaManagement

**Purpose:** Storage management for media files the user uploaded.

**Principle** User can upload a media file with its type to a filePath in the system. The file can be deleted, moved to other folders. When the file gets translated, the context the AI learned from it will also be associated with the media.

**State**
a set of MediaFiles with

```
- a filename (String)
- filePath (String)
- mediaType (String)
- UpdateDate (Timestamp)
- context (ExtractionResults)
- translatedVersion (OutputVersion)
```

**Actions**

upload(file: File, type: String, name: String, filePath: String): (media: MediaFile)
**require:** The type actually reflects the uploaded file's type. Filename has to be unique if in the same folder.
**effect:** create a new MediaFile entry with name located in filePath, but the same content as file in translatedVersion, since it hasn't been translated yet.

delete(media: MediaFile)
**require:** media exists
**effect:** remove media from storage

move(media: MediaFile, filePath: String)
**require:** media exists, filePath exists
**effect:** store media in the folder specify by filePath

createFolder(name: String)
**require:** None
**effect:** create a folder in the system, basically a new available filePath for the user to upload their media

### Concept 2

**Concept** TextExtraction \[MediaFile]

**Purpose** Extract text from uploaded media for the AI to learn and translate

**Principle** Given a MediaFile, AI would run extraction to recognize text within the media, and produce a transcript with metadata for the media. One media can have many ExtractionResults.

**State**
a set of ExtractionResults with

```
- source (MediaFile)
- extractedText (String)
- position (Coordinates/Timestamp)[^1]
```

**Actions**

extract(media:MediaFile): (result: ExtractionResult)
**require:** media exists
**effect:** create new ExtractionResults that is associated with the media
\[^1]: Depending on if it's flat media or video, use coordinates or timestamp

### Concept 3

**Concept** Translation\[TextExtraction]

**Purpose** Provide AI-assisted draft translation, which can later be refined by the user.

**Principle** When the AI extracts the text from the media, it translates to the target language the user selected. The user can re-edit the translation if they want to.

**State**

a set of Translations with

```
- source (ExtractionResult)
- targetLanguage (String)
- translatedText (String)
```

**actions**

createTranslation(result: ExtractionResult, targetLanguage: String): (translation:Translation)
**require:** result exists, targetLanguage is a real language
**effect:** generate a translation linked to the ExtractionResult

edit(translation: Translation, newText:String)
**require:** translation exist
**effect:** change the translatedText in translation to newText

### Concept 4

**Concept** OutputRender\[MediaFile]

**Purpose** Re-render translated content back into the media, such as subtitles for videos or redrawn text in images.

**Principle** Given a MediaFile and its translations, the system generates output versions.

**State**

a set of OutputVersion with

```
- base (MediaFile)
- translation (Translations)
```

**Actions**

render(translation:Translation):(output:OutputVersion)
**require:** translation exist
**effect:** generate a rendered output with translations embedded in the positions of the associated MediaFile described by the data stored in the ExtractionResult for each translation

export(output: OutputVersion, destination: String, type: String): (file: File)
**require:** output exists, destination exists in the device of the user, type is reasonable (example: png to jpg)
**effect:** save or download output in the chosen type to the destination on the user's device

## Synchronizations

**sync** extract

**when**MediaManagement.upload(): (MediaFile)

**then** TextExtraction.extract(MediaFile): (ExtractionResult)

**sync** createTranslation

**when** TextExtraction.extract(): (ExtractionResult)

**then** Translation.createTranslation(ExtractionResult): (Translation)

**sync** render

**when**

Translation.createTranslation():(Translation)

Translation.edit(Translation)

**then** OutputRender.render(translation): (output: Output Version)

### Brief Note

\[^2]The app relies on users providing the media to be edited up on, so a media management concept is definitely needed to allow users to have control over what they had uploaded. TextExtraction concept depends on how media is stored, because it can only extract from existing files. The results from TextExtraction is then needed by translation, because the computer needs the file to be converted into some structured string data that ties back to the media file in order to be translated. Also, translation rely on which medias are organized in one folder together and reading the text extraction result to provide more context for translation. The app also allows the user to edits so, the media file should be in an editable format before the user choose to render it. Therefore, output render concept helps to finalize and prepare the translated media file to be exported in certain file formats the user might want, while also keeping a copy of the editable verison.

\[^2]: The app is for single user and local storage. There's no such thing as online collaboration or whatever, kind of like those adobe apps: Photoshop,Illustrator, and etc.

## UI Sketch

User Home Page Sketch
![User Home Page Sketch](UserHomePage_Sketch.png)
MediaFile Edit Page for Image
![MediaFile Edit Page for Image](EditPage_Img_Sketch.png)
MediaFile Edit Page for Video
![MediaFile Edit Page for Video](EditPage_Vid_Sketch.png)

## User Journey

*Let user be call Emi. Also for ethical problem, the webtoon is copyright free, and Emi doesn't share it publicly.*

Emi found the webtoon, "Bloodline" (this is made up title), she likes so much just updated its newest chapter in the korean website it's publishing in. The artist didn't choose to collaborate with other publisher to get their work translated.

So the entire chapter is in Korean, and so she took a long screenshot of the chapter and uploaded it as an image file to the "Bloodline" folder, where she had been uploading all the previous chapters, in the app, TEPKonjac. Emi waited for some minutes for the app to scan and recognize the text and their locations in the image, then translate it to English, and render the English captions to the caption box with the Korean captions gone. When translating, AI knew from previous chapters that the background of the webtoon is historical, and tend to translate using more historical referencing nouns.

Emi is looking over the translated verison and saw the app had translated a word to 'consort Yoo', but she been reading so much other historical webtoons and think the word concubine suits better based on what she had been reading. So she edited the translated verison by clicking on the marker location (blue circles in the img edit page sketch) for this caption and saved her edit. After saving her edit, it's immediately reflected on the translated image again.

After reading the translated image inside the app, she wants save the chapter locally to reread in a cleaner verison with no distraction, while waiting for the next chapter to come out. So she decides to export the editable version image that is not in jpg format, to jpg format and store it in her downloads folder of her device. Now Emi has a translated version of the latest Korean webtoon in her hand within some minutes after the webtoon was released.

## Feedback on this assignment: Problem Statement: 16 (out of 16)

Comment: Good work identifying an interesting problem that is relevant to you!
Application Pitch: 10 (out of 14)
Comment: -4: Your Quick-Edit Mode feature is out of the scope of this class and we anticipate that implementation will be very difficult.
Concept Design: 20 (out of 39)
Comment: -8: Your concepts and syncs do not allow you to fully realize your proposed features.
-1: You are missing many generic types from multiple concept definitions. For example, If you choose to store ExtractionResults and OutputVersion in MediaFile in your state, you need to have them as generic types, as well as have functionality to initialize this state at some point. You are missing an update action to associate the new file with an updated context or translated version, so you never actually are able to add them to your MediaManagement state.
-6: You are missing a very key consideration in your proposed app which is limits your idea from becoming a fully working product. How do you imagine separate users will interact with this app? Are all users accessing the same file system for storing media? Will all users be able to edit and delete any media uploads?
-2: You are violating modularity in your concepts. Remember that concepts should not know anything about each other, so for example in your OutputRender concept, you cannot just pass in a Translation to initialize the OutputVersion state. OutputRender should not know anything about what is stored within Translation, so they cannot access what is in the Translation concept to render anything. Plus, even if they did, Translation does not even store MediaFile--so you would have to recursively violate modularity to access the file associated with the Extraction.
-2: You are missing parts of your syncs that really show the relationship between your concept states. For your render sync, how do you imagine you are getting your original media file from the translation in order to create a final render?
UI Sketches: 5 (out of 6)
Comment: Good annotations!
User Journey: 9 (out of 9)
Comment: Good work!
Clarity and Organization: 5 (out of 5)
Critical Use of Tools: 5 (out of 5)
Total points: 70/94

How should I moderate my concept 1 according to the feedbacks?
