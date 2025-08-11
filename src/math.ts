// --- Vector Math ---
export class Vec3 {
    x: number;
    y: number;
    z: number;
    
    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    scale(n: number): Vec3 {
        return new Vec3(this.x * n, this.y * n, this.z * n);
    }
    floor(): Vec3 {
        return new Vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    }
}

export function packVec3([x, y, z]: [number, number, number]): bigint {
    const ux = BigInt(x >>> 0);
    const uy = BigInt(y >>> 0);
    const uz = BigInt(z >>> 0);
    return (ux << 64n) | (uy << 32n) | uz;
}
