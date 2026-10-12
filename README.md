# Stride — personal workout planner

A small, mobile-friendly workout planner designed for one person. It is a static web app: GitHub Pages serves the app files, while workout data stays in the browser's local storage on the device where it is entered.

## What's included

- Weekly schedule: Monday whole-body gym, Tuesday and Friday cycling intervals, Wednesday hike every other week, Saturday morning group walk, and Sunday steady distance ride.
- A day can be selected and logged independently, so the gym machine order stays flexible.
- A personal machine list with saved settings and previous weight, sets, and reps shown when logging again.
- Cycling duration, distance, interval or route notes, and general session notes.
- JSON backup download and restore.
- Installable home-screen experience and a basic offline app shell.

## Publish with GitHub Pages

1. Push the repository files to GitHub.
2. On the repository page, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. Wait for the Pages address to appear in that section.

The repository must be public for GitHub Free Pages. The repository contains the app code only; do not put personal workout exports in the repository.

## Use on iPhone

Open the Pages address in Chrome on the iPhone. Use Chrome's Share menu and choose **Add to Home Screen**. The app stores workout records in the browser storage on that iPhone. Download a backup from **Backup** regularly. Restoring a backup replaces the data currently stored in that browser.

## Local development

Open the repository folder in VS Code. For a quick preview, use a local web server extension such as Live Server, or publish through GitHub Pages and open the published address. Browser storage used on a computer is separate from storage on the iPhone.
