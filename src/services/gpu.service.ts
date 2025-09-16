import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GpuService {
  isWebGpuSupported = signal<boolean | null>(null);
  // FIX: Use 'any' for adapter info as WebGPU types may not be available in the TS environment, causing a 'Cannot find name GPUAdapterInfo' error.
  adapterInfo = signal<any | null>(null);

  constructor() {
    this.checkWebGpuSupport();
  }

  private async checkWebGpuSupport(): Promise<void> {
    // FIX: Cast navigator to `any` to access the experimental `gpu` property.
    // This resolves the error "Property 'requestAdapter' does not exist on type 'unknown'".
    const gpu = (navigator as any).gpu;
    if (!gpu) {
      this.isWebGpuSupported.set(false);
      return;
    }

    try {
      const adapter = await gpu.requestAdapter();
      if (adapter) {
        this.isWebGpuSupported.set(true);
        // requestAdapterInfo is a new method and might not be available on all adapters
        if ('requestAdapterInfo' in adapter && typeof adapter.requestAdapterInfo === 'function') {
           this.adapterInfo.set(await adapter.requestAdapterInfo());
        }
      } else {
        this.isWebGpuSupported.set(false);
      }
    } catch (error) {
      console.error('Error while checking for WebGPU support:', error);
      this.isWebGpuSupported.set(false);
    }
  }
}
