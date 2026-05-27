import { fetchAddonCatalog } from './hooks/useCinemaAddon';

async function run() {
    const items = await fetchAddonCatalog('https://raw.githubusercontent.com/kunwarxshashank/rogplay_addons/refs/heads/main/movies/desihub.json');
    console.log(items);
}

run();
