/**
 * Where the dashboard reads its scan data from at runtime.
 *
 * `public/data` is committed to this repository and refreshed by the nightly scan
 * workflow, which on purpose does not trigger a Pages deployment. Whatever is
 * deployed therefore carries the data of the day it was built, so the browser must
 * not read the copy that sits next to the bundle - it reads the files straight out
 * of the repository instead, and a data-only commit is live without a redeploy.
 */

/** `public/data` as the dev server exposes it, and the fallback for any other host. */
const LOCAL_DATA_URL = `${import.meta.env.BASE_URL}data/`;

/** `<owner>.github.io`: the only host a repository can be derived from. */
const PAGES_HOST = /^([^.]+)\.github\.io$/;

const withSlash = (url: string) => url.endsWith('/') ? url : `${url}/`;

/**
 * `public/data` of `<owner>/<repo>` on raw.githubusercontent.com, which answers
 * with `Access-Control-Allow-Origin: *` and revalidates cheaply. The ref is `HEAD`,
 * the default branch, so a fork that does not call it `main` needs no change.
 */
const repositoryDataUrl = (owner: string, repo: string) =>
    `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/public/data/`;

/**
 * The repository behind a GitHub Pages URL: the owner is the host label, the
 * repository the first segment of `BASE_URL` - `/camel-kameleon/` for a project
 * site, and `/` for an owner site, which is the `<owner>.github.io` repository.
 */
function pagesDataUrl(hostname: string): string | undefined {
    const owner = PAGES_HOST.exec(hostname)?.[1];
    if (!owner) {
        return undefined;
    }
    const [repo = hostname] = import.meta.env.BASE_URL.split('/').filter(Boolean);
    return repositoryDataUrl(owner, repo);
}

function resolveDataBaseUrl(): string {
    // Any other host - a custom domain, `vite preview` - says where its data lives.
    const configured = import.meta.env.VITE_DATA_BASE_URL;
    if (configured) {
        return withSlash(configured);
    }
    // The dev server serves public/data itself, straight from the working copy.
    if (import.meta.env.DEV) {
        return LOCAL_DATA_URL;
    }
    const pages = pagesDataUrl(window.location.hostname);
    if (!pages) {
        console.warn(`Not a github.io host and VITE_DATA_BASE_URL is unset, reading data from ${LOCAL_DATA_URL}`);
    }
    return pages ?? LOCAL_DATA_URL;
}

/** Absolute base of the data directory, trailing slash included. */
export const DATA_BASE_URL = resolveDataBaseUrl();

/** URL of one file below the data directory, e.g. `versions.json`. */
export const dataUrl = (path: string) => `${DATA_BASE_URL}${path}`;
