declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(...args: Int16Array[]): Uint8Array;
    flush(): Uint8Array;
  }
}
