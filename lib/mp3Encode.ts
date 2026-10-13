function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

export async function audioBufferToMp3(audioBuffer: AudioBuffer, bitrateKbps: number = 128): Promise<Blob> {
  // The package's CommonJS entry has missing imports; its bundled build is self-contained.
  const { Mp3Encoder } = await import('./vendor/lamejs');

  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new Mp3Encoder(numChannels, sampleRate, bitrateKbps);

  const samplesLeft = audioBuffer.getChannelData(0);
  const samplesRight = numChannels > 1 ? audioBuffer.getChannelData(1) : samplesLeft;

  const blockSize = 1152;
  const mp3Data: Uint8Array[] = [];

  for (let i = 0; i < samplesLeft.length; i += blockSize) {
    const leftChunk = floatTo16BitPCM(samplesLeft.subarray(i, i + blockSize));
    const rightChunk = floatTo16BitPCM(samplesRight.subarray(i, i + blockSize));
    const mp3buf = numChannels === 2
      ? encoder.encodeBuffer(leftChunk, rightChunk)
      : encoder.encodeBuffer(leftChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(endBuf);
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mpeg' });
}
