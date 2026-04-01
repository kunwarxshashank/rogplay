export const PROVIDERS = {
    NETFLIX: 8,
    AMAZON: 9,
    HULU: 15,
    DISNEY: 337,
    PEACOCK: 384,
    APPLETV: 450,
    HBOMAX: 460,
    ZEE5: 461,
    PARAMOUNT: 462
};

export const PROVIDER_LOGOS: any = {
    [PROVIDERS.NETFLIX]: require('@/assets/images/netflix.png'),
    [PROVIDERS.AMAZON]: require('@/assets/images/prime.webp'),
    [PROVIDERS.HULU]: require('@/assets/images/hulu.webp'),
    [PROVIDERS.DISNEY]: require('@/assets/images/disneyplus.webp'),
    [PROVIDERS.PEACOCK]: require('@/assets/images/peacock.webp'),
    [PROVIDERS.APPLETV]: require('@/assets/images/appletv.webp'),
    [PROVIDERS.HBOMAX]: require('@/assets/images/hbomax.webp'),
    [PROVIDERS.ZEE5]: require('@/assets/images/zee5.webp'),
    [PROVIDERS.PARAMOUNT]: require('@/assets/images/paramount.webp'),
};

export const PROVIDER_NAMES: { [key: number]: string } = {
    [PROVIDERS.NETFLIX]: 'Netflix',
    [PROVIDERS.AMAZON]: 'Prime Video',
    [PROVIDERS.HULU]: 'Hulu',
    [PROVIDERS.DISNEY]: 'Disney+',
    [PROVIDERS.PEACOCK]: 'Peacock',
    [PROVIDERS.APPLETV]: 'Apple TV',
    [PROVIDERS.HBOMAX]: 'HBO Max',
    [PROVIDERS.ZEE5]: 'Zee5',
    [PROVIDERS.PARAMOUNT]: 'Paramount+'
};
