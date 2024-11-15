import { DexService } from './dataFetcher';
import * as path from 'path';

async function main() {
    try {
        console.log('Starting DEX data fetching service...');
        console.log('Current working directory:', process.cwd());
        console.log('Full path to cache file:', path.resolve('dex-cache.json'));
        await DexService.startUpdateProcess();
    } catch (error) {
        console.error('Error starting DEX service:', error);
    }
}

main(); 