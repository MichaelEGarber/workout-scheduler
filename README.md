# Stride — personal workout planner

A mobile-friendly workout planner designed for one person. The app can store data in this browser and optionally sync it to a private Supabase project.

## What's included

- Default week: gym and outdoor bike alternate from the first gym day across Sunday through Friday; Saturday defaults to the group walk. There are no default rest days.
- Change any date to gym strength, bike ride, hike, recovery day, light gym (rain/heat), or group walk.
- Ordered starter strength circuit: seated leg press, chest press, hamstring curl, seated row, leg extension, optional seated calf raise. Start at 1 × 8–10, easy effort; progression milestones appear in the workout logger.
- Strength progression prompts use two symptom-free weeks at each stage; no heart-rate target is prescribed.
- Hike logs include trail name, length, and duration. Outdoor bike logs include a brief route/trail description, distance, and duration.
- Machine settings, weight, sets, and reps from the previous gym workout carry into the next gym log. Changes saved to a gym log are used the next time.
- JSON backup and restore. Existing version 1 backups and saved workout logs migrate when loaded.
- Optional, private cloud sync; installable home-screen experience and basic offline app shell.

## Optional personal cloud sync

Sync uses a free Supabase project and email sign-in. It is configured for personal use: each signed-in account can read and change only its own workout row, enforced in the database with row-level security. Sync is manual: press **Sync now** on each device after making changes. The app asks which copy to keep if both the device and cloud changed since the last sync.

After saving the project connection, a button at the bottom of the app opens that project's Supabase dashboard in a new tab. It does not pass credentials or sign in automatically. If the project is paused, choose it in the dashboard and click **Resume project**.

1. Create a project on [Supabase](https://supabase.com/dashboard). The free tier has limits and may pause projects after a period of inactivity; check the [current pricing](https://supabase.com/pricing) and [free-project pausing details](https://supabase.com/docs/guides/platform/free-project-pausing).
2. In that project's **SQL Editor**, run the contents of `supabase-setup.sql` once. It creates one private data row per account and enables row-level access rules.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to your app's address (for example its GitHub Pages URL). Add that same address to the allowed redirect URLs so email sign-in links return to the app.
4. In Supabase **Project Settings → API**, copy the Project URL and the **publishable** key (or legacy `anon` key). Never use a secret or `service_role` key in this app or browser.
5. Open the app, choose the cloud button, enter the URL and publishable key, and save the connection. Enter your email and request a sign-in link. Open the link on the device where the app is installed.
6. Repeat the connection steps on another device with the same project and email, then use **Sync now** to read or write the latest workout data.

The project URL, publishable key, and signed-in session are kept in that browser's local storage. The workout data also remains available locally. Keep using **Backup** to download an independent copy, especially before changing devices or clearing browser data. If Supabase is unavailable, your local workout log remains accessible.

## Publish with GitHub Pages

1. Push the repository files to GitHub.
2. On the repository page, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. Wait for the Pages address to appear in that section.

The repository must be public for GitHub Free Pages. The repository contains app code only; do not put personal workout exports or a Supabase secret key in the repository.

## Use on iPhone

Open the Pages address in Chrome on the iPhone. Use Chrome's Share menu and choose **Add to Home Screen**. Browser storage on the iPhone is separate from a computer, so enable cloud sync on each device or restore a downloaded backup.

## Local development

Open the repository folder in VS Code. For a quick preview, use a local web server extension such as Live Server, or publish through GitHub Pages and open the published address. The Supabase sign-in redirect URL must include the address you use to open the app.
