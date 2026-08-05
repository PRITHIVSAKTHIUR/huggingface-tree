# **[huggingface-tree](https://huggingface.co/spaces/strangertoolshf/huggingface-tree)**

<table>
  <tr>
    <td width="40%" align="center">
      <img src="https://github.com/user-attachments/assets/34529f38-1e64-4268-89f1-5a209748c91e" alt="hf-tree preview" width="100%">
    </td>
    <td width="60%">
      <h3>🌳 huggingface-tree (hf-tree)</h3>
      <p>
        A lightweight, browser-based tool to visualize the file structure of any Hugging Face model, dataset, or Space without cloning the repository.
      </p>
      <p>
        <strong>huggingface-tree (hf-tree)</strong> fetches and renders the complete directory tree of any public or private Hugging Face repository directly in the browser.
      </p>
      <p>
        It communicates with the Hugging Face API and requires no local installation or backend server.
      </p>
    </td>
  </tr>
</table>

> [!IMPORTANT]
docker-app: [hf-space](https://huggingface.co/spaces/strangertoolshf/huggingface-tree), static-app: [github-pages](https://prithivsakthiur.github.io/huggingface-tree/)

## Features

- Browse models, datasets, and spaces by entering a repository path
- Recursive directory traversal with folder and file counts
- Multiple tree rendering styles: Classic, Slashed, ASCII, and Minimal
- Sort options: folders first, alphabetical, and by file size
- Live filter/search within the rendered tree
- Copy the full tree as plain text
- LFS file detection with badges
- File type icons for common extensions
- Shareable URL via hash-based routing
- Private repository access using a HuggingFace token
- Light and dark theme toggle
- Session-level caching to reduce redundant API calls

## Usage

Open the HTML file in any modern browser, or host it on a static server. No build step is required.

### Fetch a repository tree

1. Select the repository type: Model, Dataset, or Space.
2. Enter the repository path in the format `username/repo-name`.
3. Optionally specify a branch or revision (defaults to `main`).
4. Click Fetch.

### Access private repositories

1. Click the Token button in the top-right corner.
2. Paste a HuggingFace access token (format: `hf_...`).
3. Click Save. The token is stored in browser localStorage.

Note: Do not use this on shared or public computers, as the token persists in localStorage until explicitly cleared.

## Supported Repository Types

| Type    | URL Prefix              |
|---------|-------------------------|
| Model   | huggingface.co/         |
| Dataset | huggingface.co/datasets/ |
| Space   | huggingface.co/spaces/  |

## Tree Styles

| Style   | Description                         | Example               |
|---------|-------------------------------------|-----------------------|
| Classic | Standard tree connectors            | `-- file.txt`     |
| Slashed | Path-style with slash prefixes      | `/src`                |
| ASCII   | Plain ASCII connectors              | `+-- file.txt`        |
| Minimal | Indentation only, no connectors     | `    file.txt`        |

## Sort Options

- Folders First (A-Z)
- Folders First (Z-A)
- Name (A-Z)
- Name (Z-A)
- Size (Largest first)
- Size (Smallest first)

## URL Sharing

After fetching a repository, the browser URL updates to reflect the current view using a hash fragment:

```
#models/username/repo-name/branch
```

This URL can be shared directly. When opened, the tool automatically fetches and renders the same repository.

## File

The entire application is a single self-contained HTML file with no external dependencies beyond CDN-hosted assets (Font Awesome icons and Google Fonts). It can be served from any static host or opened locally.

## Dependencies (CDN)

- Font Awesome 6.4.0 (icons)
- Google Fonts: JetBrains Mono, Inter

No npm packages or build tools are required to run the application.

## API

This tool uses the public HuggingFace Hub API:

```
https://huggingface.co/api/{type}/{repo}/tree/{branch}
```

Rate limits apply to unauthenticated requests. Adding a token increases the allowed request rate.

---

## License

Apache-2.0
