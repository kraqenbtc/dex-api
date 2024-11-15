import { hexToCV, cvToHex, uintCV } from '@stacks/transactions';
import { CONFIG } from './config';
import { DexPool, DexInfo, Dex } from './types';
import { CacheService } from './cacheService';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DexService {
  private static isUpdating = false;
  private static currentDexIndex = 0;
  private static currentPoolId = 1;

  static async fetchPoolCount(contractAddress: string, contractName: string): Promise<number> {
    try {
      const response = await fetch(
        `https://api.mainnet.hiro.so/v2/contracts/call-read/${contractAddress}/${contractName}/get-nr-pools`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: contractAddress,
            arguments: []
          })
        }
      );

      if (!response.ok) throw new Error('Failed to fetch pool count');

      const data = await response.json();
      const cv: any = hexToCV(data.result);
      return Number(cv.value);
    } catch (error) {
      console.error('Error fetching pool count:', error);
      return 0;
    }
  }

  static async fetchPoolDetails(
    contractAddress: string,
    contractName: string,
    poolId: number
  ): Promise<DexPool | null> {
    try {
      await delay(CONFIG.API.FETCH_DELAY);
      
      const poolIdCV = uintCV(poolId);
      const response = await fetch(
        `https://api.mainnet.hiro.so/v2/contracts/call-read/${contractAddress}/${contractName}/do-get-pool`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: contractAddress,
            arguments: [cvToHex(poolIdCV)]
          })
        }
      );

      if (!response.ok) throw new Error('Failed to fetch pool details');

      const data = await response.json();
      const cv: any = hexToCV(data.result);
      const poolData = cv.value.data || cv.value;

      return {
        poolId,
        lpToken: poolData['lp-token']?.value || poolData.lpToken?.value || `${contractAddress}.${contractName}`,
        reserve0: poolData.reserve0?.value?.toString() || poolData['balance-x']?.value?.toString() || '0',
        reserve1: poolData.reserve1?.value?.toString() || poolData['balance-y']?.value?.toString() || '0',
        symbol: poolData.symbol?.value || 'LP',
        token0: poolData.token0?.value || poolData['token-x']?.value || '',
        token1: poolData.token1?.value || poolData['token-y']?.value || ''
      };
    } catch (error) {
      console.error(`Error fetching pool ${poolId}:`, error);
      await delay(5000); // 5 saniye bekle
      return null;
    }
  }

  static async getAllDexInfo(): Promise<DexInfo[]> {
    const cachedData = await CacheService.loadData();
    return cachedData || [];
  }

  static async startUpdateProcess(): Promise<void> {
    console.log("Starting update process...");
    if (!this.isUpdating) {
      this.continuousUpdate();
    }
  }

  private static async continuousUpdate(): Promise<void> {
    if (this.isUpdating) return;
    
    this.isUpdating = true;

    try {
        const dexes = Object.values(CONFIG.DEXES) as Dex[];

        while (true) {
            let results = await CacheService.loadData();

            for (let i = this.currentDexIndex; i < dexes.length; i++) {
                const dex = dexes[i];
                let poolCount;
                
                try {
                    poolCount = await this.fetchPoolCount(dex.contractAddress, dex.contractName);
                } catch (error) {
                    console.error(`Error fetching pool count for ${dex.name}, retrying in 5 seconds...`);
                    await delay(5000);
                    i--; // Aynı DEX'i tekrar dene
                    continue;
                }
                
                const existingDexIndex = results.findIndex(r => r.name === dex.name);
                let pools = existingDexIndex !== -1 ? [...results[existingDexIndex].pools] : [];

                for (let j = this.currentPoolId; j <= poolCount; j++) {
                    try {
                        const poolDetails = await this.fetchPoolDetails(dex.contractAddress, dex.contractName, j);
                        
                        if (poolDetails) {
                            const poolIndex = pools.findIndex(p => p.poolId === poolDetails.poolId);
                            if (poolIndex !== -1) {
                                pools[poolIndex] = poolDetails;
                            } else {
                                pools.push(poolDetails);
                            }
                            
                            const updatedDex: DexInfo = {
                                name: dex.name,
                                contractAddress: dex.contractAddress,
                                contractName: dex.contractName,
                                poolAmount: poolCount,
                                pools: pools
                            };

                            if (existingDexIndex !== -1) {
                                results[existingDexIndex] = updatedDex;
                            } else {
                                results.push(updatedDex);
                            }
                            
                            await CacheService.saveData(results);
                        }
                    } catch (error) {
                        console.error(`Error fetching pool ${j} for ${dex.name}, retrying in 5 seconds...`);
                        await delay(5000);
                        j--; // Aynı pool'u tekrar dene
                        continue;
                    }
                }

                this.currentDexIndex = (i + 1) % dexes.length;
                this.currentPoolId = 1;
            }

            this.currentDexIndex = 0;
            // Döngü bitince beklemeden devam et
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error:`, error);
        await delay(5000);
    } finally {
        this.isUpdating = false;
        this.continuousUpdate();
    }
  }
}