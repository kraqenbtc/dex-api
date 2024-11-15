import { DexInfo } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CacheService {
    private static readonly CACHE_FILE = 'dex-cache.json';

    private static async ensureCacheFileExists(): Promise<void> {
        try {
            await fs.access(this.CACHE_FILE);
        } catch {
            await this.saveData([]);
        }
    }

    static async saveData(newData: DexInfo[]): Promise<void> {
        try {
            await this.ensureCacheFileExists();
            
            // Mevcut verileri oku
            const existingData = await this.loadData();
            
            // Değişiklikleri kontrol et
            const changes = this.detectChanges(existingData, newData);
            if (changes.length > 0) {
                await fs.writeFile(this.CACHE_FILE, JSON.stringify(newData, null, 2));
                console.log(`[${new Date().toISOString()}] Changes detected:`);
                changes.forEach(change => console.log(`- ${change}`));
            }
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    }

    private static detectChanges(oldData: DexInfo[], newData: DexInfo[]): string[] {
        const changes: string[] = [];

        newData.forEach(newDex => {
            const oldDex = oldData.find(d => d.name === newDex.name);
            
            if (!oldDex) {
                changes.push(`New DEX added: ${newDex.name}`);
                return;
            }

            newDex.pools.forEach(newPool => {
                const oldPool = oldDex.pools.find(p => p.poolId === newPool.poolId);
                
                if (!oldPool) {
                    changes.push(`${newDex.name}: New pool added - ID: ${newPool.poolId}`);
                } else {
                    // Reserve değişikliklerini kontrol et
                    if (oldPool.reserve0 !== newPool.reserve0 || oldPool.reserve1 !== newPool.reserve1) {
                        changes.push(
                            `${newDex.name} Pool ${newPool.poolId}: Reserves updated ` +
                            `(${oldPool.reserve0}->${newPool.reserve0}, ${oldPool.reserve1}->${newPool.reserve1})`
                        );
                    }
                }
            });
        });

        return changes;
    }

    static async loadData(): Promise<DexInfo[]> {
        try {
            await this.ensureCacheFileExists();
            const data = await fs.readFile(this.CACHE_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }
} 