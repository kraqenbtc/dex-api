export interface DexPool {
    poolId: number;
    lpToken: string;
    reserve0: string;
    reserve1: string;
    symbol: string;
    token0: string;
    token1: string;
}

export interface DexInfo {
    name: string;
    contractAddress: string;
    contractName: string;
    poolAmount: number;
    pools: DexPool[];
}

export interface Dex {
    name: string;
    contractAddress: string;
    contractName: string;
} 