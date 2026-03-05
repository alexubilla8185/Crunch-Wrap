class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      if (channelData) {
        // We must clone the Float32Array because the underlying ArrayBuffer
        // is owned by the browser's audio thread and will be reused/neutered.
        const buffer = new Float32Array(channelData);
        this.port.postMessage(buffer);
      }
    }
    // Return true to keep the processor alive
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
