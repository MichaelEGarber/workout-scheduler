# Stride — personal workout planner

A small, mobile-friendly workout planner designed for one person. GitHub Pages serves the static app; workout data stays in the browser's local storage on the device where it is entered.

## What's included

- Default week: Monday gym strength, Tuesday bike, Wednesday recovery, Thursday gym strength, Friday bike, Saturday morning group walk, Sunday recovery.
- Change any date to gym strength, bike ride, hike, recovery day, light gym (rain/heat), or group walk. Choices are saved per date and remain editable.
- Ordered starter strength circuit: seated leg press, chest press, hamstring curl, seated row, leg extension, optional seated calf raise. Start at 1 × 8–10, easy effort; progression milestones appear in the workout logger.
- Safety reminder to get cardiac/device-team guidance before beginning or progressing strength work; no heart-rate target is prescribed.
- Personal machine list with saved settings and previous weight, sets, and reps shown when logging again.
- Session logging for duration, distance, notes, machines, and effort context.
- JSON backup and restore. Existing version 1 backups and saved workout logs migrate when loaded.
- Installable home-screen experience and a basic offline app shell.

## Publish with GitHub Pages

1. Push the repository files to GitHub.
2. On the repository page, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. Wait for the Pages address to appear in that section.

The repository must be public for GitHub Free Pages. The repository contains app code only; do not put personal workout exports in the repository.

## Use on iPhone

Open the Pages address in Chrome on the iPhone. Use Chrome's Share menu and choose **Add to Home Screen**. The app stores workout records in that browser on that iPhone. Download a backup from **Backup** regularly. Restoring a backup replaces the workout data currently stored in that browser.

## Local development

Open the repository folder in VS Code. For a quick preview, use a local web server extension such as Live Server, or publish through GitHub Pages and open the published address. Browser storage used on a computer is separate from storage on the iPhone.
