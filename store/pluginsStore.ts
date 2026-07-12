import { create } from 'zustand';
import { storage } from './mmkv';
import axios from 'axios';

const PLUGINS_REPO_KEY = 'nuvio_plugin_repos';
const PLUGINS_SCRAPER_KEY = 'nuvio_scrapers_code';

export interface NuvioScraper {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    supportedTypes: string[];
    filename: string;
    enabled: boolean;
    formats: string[];
    logo: string;
    contentLanguage: string[];
    // We add this internally
    sourceRepoUrl: string;
    rawCode?: string;
}

export interface NuvioRepo {
    name: string;
    version: string;
    repoUrl: string; // the manifest.json url
    scrapers: NuvioScraper[];
}

interface PluginsState {
    repos: NuvioRepo[];
    scrapers: NuvioScraper[]; // flattened list
    isLoading: boolean;
    loadRepos: () => void;
    addRepo: (manifestUrl: string) => Promise<boolean>;
    removeRepo: (manifestUrl: string) => Promise<void>;
    toggleScraper: (scraperId: string) => void;
}

export const usePluginsStore = create<PluginsState>((set, get) => ({
    repos: [],
    scrapers: [],
    isLoading: false,

    loadRepos: () => {
        const storedRepos = storage.getString(PLUGINS_REPO_KEY);
        const storedScrapers = storage.getString(PLUGINS_SCRAPER_KEY);
        if (storedRepos) {
            set({ repos: JSON.parse(storedRepos) });
        }
        if (storedScrapers) {
            set({ scrapers: JSON.parse(storedScrapers) });
        }
    },

    addRepo: async (manifestUrl: string) => {
        const { repos, scrapers } = get();
        if (repos.some(r => r.repoUrl === manifestUrl)) {
            throw new Error('Repository already added');
        }

        set({ isLoading: true });
        try {
            const res = await axios.get(manifestUrl, { timeout: 10000 });
            const manifest = res.data;

            if (!manifest.scrapers || !Array.isArray(manifest.scrapers)) {
                throw new Error('Invalid Nuvio repository format');
            }

            const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf('/'));
            const newScrapers: NuvioScraper[] = [];

            // Download code for each scraper
            for (const scraper of manifest.scrapers) {
                try {
                    const jsUrl = `${baseUrl}/${scraper.filename}`;
                    const jsRes = await axios.get(jsUrl, { timeout: 10000 });
                    newScrapers.push({
                        ...scraper,
                        sourceRepoUrl: manifestUrl,
                        rawCode: jsRes.data
                    });
                } catch (e) {
                    console.warn(`Failed to fetch scraper ${scraper.name}`, e);
                }
            }

            const newRepo: NuvioRepo = {
                name: manifest.name || 'Unknown Repo',
                version: manifest.version || '1.0.0',
                repoUrl: manifestUrl,
                scrapers: newScrapers.map(s => ({ ...s, rawCode: undefined })) // don't store raw code in repo list
            };

            const updatedRepos = [...repos, newRepo];
            const updatedScrapers = [...scrapers.filter(s => s.sourceRepoUrl !== manifestUrl), ...newScrapers];

            storage.set(PLUGINS_REPO_KEY, JSON.stringify(updatedRepos));
            storage.set(PLUGINS_SCRAPER_KEY, JSON.stringify(updatedScrapers));

            set({ repos: updatedRepos, scrapers: updatedScrapers, isLoading: false });
            return true;
        } catch (error) {
            set({ isLoading: false });
            throw new Error('Failed to fetch repository: ' + (error as Error).message);
        }
    },

    removeRepo: async (manifestUrl: string) => {
        const { repos, scrapers } = get();
        const updatedRepos = repos.filter(r => r.repoUrl !== manifestUrl);
        const updatedScrapers = scrapers.filter(s => s.sourceRepoUrl !== manifestUrl);

        storage.set(PLUGINS_REPO_KEY, JSON.stringify(updatedRepos));
        storage.set(PLUGINS_SCRAPER_KEY, JSON.stringify(updatedScrapers));

        set({ repos: updatedRepos, scrapers: updatedScrapers });
    },

    toggleScraper: (scraperId: string) => {
        const { scrapers, repos } = get();
        
        const updatedScrapers = scrapers.map(s => 
            s.id === scraperId ? { ...s, enabled: !s.enabled } : s
        );

        // Update the enabled state inside repos as well for UI mapping
        const updatedRepos = repos.map(repo => ({
            ...repo,
            scrapers: repo.scrapers.map(s => 
                s.id === scraperId ? { ...s, enabled: !s.enabled } : s
            )
        }));

        storage.set(PLUGINS_REPO_KEY, JSON.stringify(updatedRepos));
        storage.set(PLUGINS_SCRAPER_KEY, JSON.stringify(updatedScrapers));

        set({ scrapers: updatedScrapers, repos: updatedRepos });
    }
}));
