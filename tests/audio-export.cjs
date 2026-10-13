const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const JSZip = require('jszip');

function loadTs(file, imports = {}, globals = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  const requireFile = createRequire(filename);
  vm.runInNewContext(code, {
    exports, require: name => imports[name] || requireFile(name),
    Blob, console, ...globals,
  }, { filename });
  return exports;
}

function buffer(channels, sampleRate, duration) {
  const length = Math.round(sampleRate * duration);
  const samples = Float32Array.from({ length }, (_, i) => Math.sin(i * 440 * 2 * Math.PI / sampleRate) * 0.25);
  return { numberOfChannels: channels, sampleRate, length, duration, getChannelData: () => samples };
}

(async () => {
  const encoder = loadTs('lib/mp3Encode.ts');
  for (const channels of [1, 2]) {
    const blob = await encoder.audioBufferToMp3(buffer(channels, 44100, 0.1));
    assert.equal(blob.type, 'audio/mpeg');
    assert.ok(blob.size > 100);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1] & 0xe0, 0xe0, 'MP3 frame sync');
  }

  const starts = [];
  const audio = loadTs('lib/audioExport.ts', { '@/lib/mp3Encode': encoder }, {
    AudioContext: class {
      async decodeAudioData() { return buffer(1, 48000, 0.1); }
      async close() {}
    },
    OfflineAudioContext: class {
      constructor(channels, length, sampleRate) {
        assert.equal(length, 8820, 'two 0.1s clips rendered at 44.1kHz');
        this.output = buffer(channels, sampleRate, length / sampleRate);
      }
      createBufferSource() { return { connect() {}, start(time) { starts.push(time); } }; }
      async startRendering() { return this.output; }
    },
  });
  assert.equal(await audio.exportUserRecordings([]), null);
  const blob = new Blob(['fixture']);
  const result = await audio.exportMixedPodcast([{ audioBlob: blob, questionAudioBlob: blob }]);
  assert.equal(result.duration, 0.2);
  assert.deepEqual(starts, [0, 0.1]);
  assert.ok(result.blob.size > 100);

  const zip = new JSZip();
  zip.file('audio.mp3', await result.blob.arrayBuffer());
  const restored = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' }));
  assert.deepEqual(await restored.file('audio.mp3').async('uint8array'), new Uint8Array(await result.blob.arrayBuffer()));
  console.log('Audio export checks passed: mono/stereo MP3, mixed duration, empty session, ZIP audio round-trip.');
})().catch(error => { console.error(error); process.exitCode = 1; });
