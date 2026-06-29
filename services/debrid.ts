export type DebridProvider = 'realdebrid' | 'alldebrid' | 'premiumize' | 'torbox' | 'none';

interface DebridResolution {
    url: string;
    error?: string;
}

export async function resolveMagnet(magnetLink: string, provider: DebridProvider, apiKey: string): Promise<DebridResolution> {
    if (!apiKey) {
        return { url: '', error: 'No API key provided' };
    }

    switch (provider) {
        case 'realdebrid':
            return await resolveRealDebrid(magnetLink, apiKey);
        case 'alldebrid':
            return await resolveAllDebrid(magnetLink, apiKey);
        case 'premiumize':
            return await resolvePremiumize(magnetLink, apiKey);
        case 'torbox':
            return await resolveTorBox(magnetLink, apiKey);
        default:
            return { url: '', error: 'Provider not implemented yet' };
    }
}

async function resolveRealDebrid(magnetLink: string, apiKey: string): Promise<DebridResolution> {
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
    };

    try {
        // 1. Add Magnet
        const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `magnet=${encodeURIComponent(magnetLink)}`
        });

        if (!addRes.ok) throw new Error('Failed to add magnet to Real-Debrid');
        const addData = await addRes.json();
        const torrentId = addData.id;

        // 2. Wait for it to be analyzed
        let torrentInfo;
        let attempts = 0;
        while (attempts < 10) {
            const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, { headers });
            if (!infoRes.ok) throw new Error('Failed to get torrent info');
            torrentInfo = await infoRes.json();

            if (torrentInfo.status === 'waiting_files_selection' || torrentInfo.status === 'downloaded') {
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
        }

        if (!torrentInfo || (torrentInfo.status !== 'waiting_files_selection' && torrentInfo.status !== 'downloaded')) {
            throw new Error('Timeout waiting for Real-Debrid to analyze torrent');
        }

        // 3. Select files if needed
        if (torrentInfo.status === 'waiting_files_selection') {
            // Find largest video file
            const videoFiles = torrentInfo.files.filter((f: any) =>
                f.path.toLowerCase().endsWith('.mp4') ||
                f.path.toLowerCase().endsWith('.mkv') ||
                f.path.toLowerCase().endsWith('.avi')
            );

            let selectedFileId = 'all';
            if (videoFiles.length > 0) {
                // Get largest file
                const largest = videoFiles.reduce((prev: any, current: any) => (prev.bytes > current.bytes) ? prev : current);
                selectedFileId = largest.id.toString();
            }

            const selectRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `files=${selectedFileId}`
            });

            if (!selectRes.ok) throw new Error('Failed to select files');

            // Wait for it to be cached/downloaded (RD usually caches popular torrents instantly)
            attempts = 0;
            while (attempts < 15) {
                const checkRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, { headers });
                torrentInfo = await checkRes.json();
                if (torrentInfo.status === 'downloaded') break;
                if (torrentInfo.status === 'downloading') {
                    // Downloading to RD servers.
                }
                await new Promise(r => setTimeout(r, 2000));
                attempts++;
            }
        }

        if (torrentInfo.status !== 'downloaded' || !torrentInfo.links || torrentInfo.links.length === 0) {
            throw new Error('Torrent is not cached or ready on Real-Debrid');
        }

        // 4. Unrestrict link
        const linkToUnrestrict = torrentInfo.links[0];
        const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `link=${encodeURIComponent(linkToUnrestrict)}`
        });

        if (!unrestrictRes.ok) throw new Error('Failed to unrestrict link');
        const unrestrictData = await unrestrictRes.json();

        if (unrestrictData.download) {
            return { url: unrestrictData.download };
        } else {
            throw new Error('No download URL returned from Real-Debrid');
        }

    } catch (error: any) {
        console.error('Real-Debrid Resolution Error:', error);
        return { url: '', error: error.message || 'Unknown error' };
    }
}

async function resolveAllDebrid(magnetLink: string, apiKey: string): Promise<DebridResolution> {
    try {
        const agent = 'rogplay';
        const addUrl = `https://api.alldebrid.com/v4/magnet/upload?agent=${agent}&apikey=${apiKey}`;

        const addFormData = new FormData();
        addFormData.append('magnets[]', magnetLink);

        const addRes = await fetch(addUrl, { method: 'POST', body: addFormData as any });
        const addData = await addRes.json();

        if (addData.status !== 'success' || !addData.data?.magnets?.[0]?.id) {
            throw new Error(addData.error?.message || 'Failed to add magnet to AllDebrid');
        }

        const magnetId = addData.data.magnets[0].id;

        let attempts = 0;
        let magnetInfo;
        while (attempts < 15) {
            const statusUrl = `https://api.alldebrid.com/v4/magnet/status?agent=${agent}&apikey=${apiKey}&id=${magnetId}`;
            const statusRes = await fetch(statusUrl);
            const statusData = await statusRes.json();

            magnetInfo = statusData.data?.magnets?.[0] || statusData.data?.magnets;
            if (Array.isArray(magnetInfo)) magnetInfo = magnetInfo[0];

            if (magnetInfo?.statusCode === 4) { // Ready
                break;
            }
            if (magnetInfo?.statusCode > 4) {
                throw new Error('AllDebrid failed to download torrent');
            }

            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        if (magnetInfo?.statusCode !== 4 || !magnetInfo?.links || magnetInfo.links.length === 0) {
            throw new Error('Torrent is not ready on AllDebrid');
        }

        const videoLink = magnetInfo.links.find((l: any) => l.filename?.match(/\.(mp4|mkv|avi)$/i)) || magnetInfo.links[0];

        const unlockUrl = `https://api.alldebrid.com/v4/link/unlock?agent=${agent}&apikey=${apiKey}&link=${encodeURIComponent(videoLink.link)}`;
        const unlockRes = await fetch(unlockUrl);
        const unlockData = await unlockRes.json();

        if (unlockData.status === 'success' && unlockData.data?.link) {
            return { url: unlockData.data.link };
        } else {
            throw new Error(unlockData.error?.message || 'Failed to unlock AllDebrid link');
        }

    } catch (error: any) {
        console.error('AllDebrid Resolution Error:', error);
        return { url: '', error: error.message || 'Unknown error' };
    }
}

async function resolvePremiumize(magnetLink: string, apiKey: string): Promise<DebridResolution> {
    try {
        const url = `https://www.premiumize.me/api/transfer/directdl?apikey=${apiKey}`;
        const formData = new FormData();
        formData.append('src', magnetLink);

        const res = await fetch(url, { method: 'POST', body: formData as any });
        const data = await res.json();

        if (data.status !== 'success' || !data.content) {
            throw new Error(data.message || 'Failed to resolve with Premiumize');
        }

        const videoFiles = data.content.filter((f: any) => f.path?.match(/\.(mp4|mkv|avi)$/i));
        let selectedFile = videoFiles.length > 0 ? videoFiles[0] : data.content[0];

        if (videoFiles.length > 0) {
            selectedFile = videoFiles.reduce((prev: any, current: any) => (prev.size > current.size) ? prev : current);
        }

        if (!selectedFile?.link) {
            throw new Error('No valid link found in Premiumize response');
        }

        return { url: selectedFile.link };

    } catch (error: any) {
        console.error('Premiumize Resolution Error:', error);
        return { url: '', error: error.message || 'Unknown error' };
    }
}

async function resolveTorBox(magnetLink: string, apiKey: string): Promise<DebridResolution> {
    try {
        const headers = { 'Authorization': `Bearer ${apiKey}` };

        const addFormData = new FormData();
        addFormData.append('magnet', magnetLink);

        const addRes = await fetch('https://api.torbox.app/v1/api/torrents/createtorrent', {
            method: 'POST',
            headers,
            body: addFormData as any
        });

        const addData = await addRes.json();
        if (!addData.success) {
            throw new Error(addData.detail || 'Failed to add magnet to TorBox');
        }

        const torrentId = addData.data?.torrent_id;
        if (!torrentId) throw new Error('No TorBox torrent ID returned');

        let attempts = 0;
        let torrentInfo;

        while (attempts < 15) {
            const listRes = await fetch('https://api.torbox.app/v1/api/torrents/mylist?bypass_cache=true', { headers });
            const listData = await listRes.json();

            if (listData.success && listData.data) {
                torrentInfo = listData.data.find((t: any) => t.id === torrentId);
                if (torrentInfo?.download_state === 'cached') {
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        if (torrentInfo?.download_state !== 'cached') {
            throw new Error('Torrent is not ready on TorBox');
        }

        const videoFiles = torrentInfo.files.filter((f: any) => f.name?.match(/\.(mp4|mkv|avi)$/i));
        const selectedFile = videoFiles.length > 0
            ? videoFiles.reduce((prev: any, current: any) => (prev.size > current.size) ? prev : current)
            : torrentInfo.files[0];

        const dlUrl = `https://api.torbox.app/v1/api/torrents/requestdl?token=${apiKey}&torrent_id=${torrentId}&file_id=${selectedFile.id}`;
        const dlRes = await fetch(dlUrl);
        const dlData = await dlRes.json();

        if (dlData.success && dlData.data) {
            return { url: dlData.data };
        } else {
            throw new Error(dlData.detail || 'Failed to get TorBox download link');
        }

    } catch (error: any) {
        console.error('TorBox Resolution Error:', error);
        return { url: '', error: error.message || 'Unknown error' };
    }
}
