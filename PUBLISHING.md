# Publish A following, in time

This is a standalone static website and a science communication project by
[Vahid Khalili Param](https://vahidparam.com/), with links to
[VRL Lab](https://varollab.com/index.html). Publish it as a **project repository**
called `a-following-in-time` under `vahidparam`.

## What is included

The Git repository starts inside `Creative_vis`, so files elsewhere in
`FollowMotivations` are outside its boundary. The `.gitignore` also limits the
files included from inside `Creative_vis`:

- Website HTML, JavaScript, CSS, public images, and credits.
- Repository configuration and the README/publishing instructions.
- Exactly six anonymous visualization files in `data/`: `followers.json`,
  `cross-ideology.json`, `both.json`, `kk-ideology0.f32.gz`,
  `rte-ideology0.f32.gz`, and `both-pairs.u16i32.gz`.

The browser needs these six data files to draw the audiences. Raw datasets,
analysis reports, Python analysis/export scripts, tests, CSV exports, and caches
stay local and are excluded from Git. These exclusions preserve the local files.

Before committing, `git ls-files` shows the complete staged/tracked file list;
`git rev-parse --show-toplevel` confirms the repository is `Creative_vis`.

## 1. Create an empty GitHub repository

Open [GitHub’s new repository form](https://github.com/new) and choose:

| Setting | Value |
| --- | --- |
| Owner | `vahidparam` |
| Repository name | `a-following-in-time` |
| Description | Interactive science communication about political audiences in Türkiye: Kılıçdaroğlu, Erdoğan, and the people who follow both. |
| Visibility | Public |
| Initial files | Leave README, .gitignore, and licence initialization unselected; the local files are ready. |

Click **Create repository**. This follows
[GitHub’s instructions for importing an existing project](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

## 2. Commit and push this folder

Run these commands in the terminal where this project lives:

```bash
cd /cta/users/vkhalili/FollowMotivations/Creative_vis
git status
git add .
git commit -m "Add A following, in time"
git remote add origin https://github.com/vahidparam/a-following-in-time.git
git push -u origin main
```

The local repository has been initialized on `main`. The first commit and push
are yours to run. `index.html` must appear directly in the GitHub repository,
alongside `story.js`, `assets/`, and `data/`.

If Git asks for your identity, set it for this repository and retry the commit:

```bash
git config user.name "Vahid Khalili Param"
git config user.email "YOUR_GITHUB_VERIFIED_EMAIL"
git commit -m "Add A following, in time"
```

Replace `YOUR_GITHUB_VERIFIED_EMAIL` with an email verified in your GitHub account,
or your GitHub-provided private commit email from your account’s email settings.
For HTTPS authentication, use your credential manager or a
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
when Git prompts for a password. A GitHub account password does not authenticate
Git pushes. If SSH is already configured, you can use
`git@github.com:vahidparam/a-following-in-time.git` as the remote URL instead.

Use Git for the initial upload: the largest included data file is 38.2 MiB,
which fits regular Git but exceeds the browser uploader’s 25 MiB per-file limit.
The repository contains approximately 79 MiB of source and anonymous data.
See [GitHub’s file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## 3. Turn on GitHub Pages

In your new repository, open **Settings → Pages**. Under **Build and deployment**:

1. Choose **Deploy from a branch** as the source.
2. Choose **main** and **/(root)**.
3. Click **Save**.

The included `.nojekyll` file lets Pages serve the static files directly. No
custom workflow, npm install, or build command is needed. Pages will publish
future commits pushed to `main` automatically.
[GitHub’s publishing-source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
documents these settings. Watch the **Actions** tab for the publishing result;
the **Pages** settings screen shows the live address.

The default project address is `https://vahidparam.github.io/a-following-in-time/`.
If `vahidparam.com` is configured as your GitHub user site’s custom domain,
GitHub automatically serves the project at
`https://vahidparam.com/a-following-in-time/` instead.
[GitHub documents this domain inheritance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages#using-a-custom-domain-across-multiple-repositories).
Confirm the actual address in Pages settings. This project needs no separate
custom domain or `CNAME` file.

## 4. Link it from your portfolio

Add a project card to the science communication or projects area of your main
website, using the live URL shown in Pages settings:

**A following, in time**

*Science communication · Interactive data storytelling*

Explore the political audiences of Kılıçdaroğlu and Erdoğan through follow dates,
political alignment, and the 5.5 million accounts that connect them.

## 5. Make future changes

Edit the files in this repository. A few useful entry points:

| What you want to change | Files |
| --- | --- |
| Opening page, methods, author section | `index.html` |
| Layout, typography, colours | `styles.css`, `both.css` |
| Individual story text | `stories.mjs`, `story-content.js` |
| Political events and sources | `events.mjs` |
| Cross-ideology passages | `cross-stories.mjs` |
| Shared-audience passages | `both-content.mjs` |
| Event imagery and credits | `event-media.mjs`, `assets/events/`, `assets/CREDITS.md` |

From the repository root, preview locally:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://localhost:8000`. On a remote machine, forward this port through SSH.
Keep asset paths relative (`assets/...`, `./data/...`); this makes the website
work within the project’s URL path as well as at a domain root. Keep the `.gz`
data files compressed: the application decompresses them in the browser.

Run the relevant checks described in [README.md](README.md), then publish edits:

```bash
git add index.html styles.css
git commit -m "Refine story presentation"
git push
```

Replace the filenames and commit message with the files you actually changed.
If you also edit the GitHub repository directly, run `git pull --ff-only` before
starting local edits. Refresh the published page after the Pages deployment
finishes to review the result.
