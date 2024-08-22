# Player for local videos

This video player is a PWA that allows you to watch local videos in your browser. It supports the following features:

- Light/dark theme (following system preferences)
- Continue watching from where you left off[^1]
- [Keyboard shortcuts](#keyboard-shortcuts)
- Global Media Controls integration
- Register as a handler for video files

[^1]: The video state is saved in the browser's local storage. If you clear your browser's data, the state will be lost. Saved state will be deleted upon video completion or for videos last played more than 30 days before.

## Screenshots

![Selection screen (light)](/images/screenshots/selection_screen_light.png)
![Selection screen (dark)](/images/screenshots/selection_screen_dark.png)
![Video screen (light)](/images/screenshots/video_screen_light.png)
![Video screen (dark)](/images/screenshots/video_screen_dark.png)

## Usage

To open a video, drag and drop it onto the app or click on the `Choose file` button.
If another video is opened, its state will be saved and the dragged video will replace the current one.

Alternatively, install the PWA, right click on the video you want to open, select `Open With` and choose this app.
You can also register this app as the default handler for video files by right clicking on a video file, selecting `Get Info`, scrolling down to `Open with`, selecting this app and clicking on `Change All...`.

> Note: In order for Picture-in-Picture (PiP) to work, Chrome must be opened (launching only this PWA won't work). I guess it's a bug in Chrome..

### Keyboard shortcuts

The following keyboard shortcuts are supported:

|                          Key                           | Action                |
| :----------------------------------------------------: | --------------------- |
|            <kbd>Space</kbd><br><kbd>K</kbd>            | Toggle play/pause     |
|                      <kbd>S</kbd>                      | Slow down by 0.1x     |
|                      <kbd>D</kbd>                      | Speed up by 0.1x      |
| <kbd>Z</kbd><br><kbd>&larr;</kbd><br><kbd>&darr;</kbd> | Rewind 10 seconds     |
| <kbd>X</kbd><br><kbd>&rarr;</kbd><br><kbd>&uarr;</kbd> | Forward 10 seconds    |
|                      <kbd>R</kbd>                      | Reset default speed   |
|                      <kbd>T</kbd>                      | Toggle time/remaining |
|                      <kbd>A</kbd>                      | Set speed to 1.8x     |
|                      <kbd>C</kbd>                      | Toggle video zoom     |
|                      <kbd>P</kbd>                      | Toggle PiP            |
|            <kbd>F</kbd><br><kbd>Enter</kbd>            | Toggle fullscreen     |
