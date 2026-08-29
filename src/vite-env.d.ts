/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Base URL of the published `public/data` directory, trailing slash optional.
     * Only needed where it cannot be derived from the location: a custom domain, a
     * host other than GitHub Pages, or `vite preview`, whose build ships no data.
     */
    readonly VITE_DATA_BASE_URL?: string;
}
