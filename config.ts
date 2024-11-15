import { Dex } from './types';

interface Config {
    API: {
        FETCH_DELAY: number;
    };
    DEXES: Record<string, Dex>;
}

export const CONFIG: Config = {
    API: {
        FETCH_DELAY: 250, // 100ms'ye düşürdük (önceki 1000ms idi)
    },
    DEXES: {
        CHARISMA: {
            name: 'CHARISMA',
            contractAddress: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
            contractName: 'univ2-core'
        }
    }
}; 