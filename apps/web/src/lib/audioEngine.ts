import type { SoundType } from '../store/pomodoro';

interface AudioEngine {
  start: (type: SoundType, volume: number) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  tick: () => void;
}

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sourceNode: any = null; // ScriptProcessorNode

  function getCtx(): AudioContext {
    if (!ctx) {
      ctx = new AudioContext();
    }
    return ctx;
  }

  function stop() {
    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch {
        // already disconnected
      }
      sourceNode = null;
    }
    if (gainNode) {
      try {
        gainNode.disconnect();
      } catch {
        // already disconnected
      }
      gainNode = null;
    }
  }

  function start(type: SoundType, volume: number) {
    stop();
    if (type === 'none') return;

    const context = getCtx();
    if (context.state === 'suspended') {
      void context.resume();
    }

    gainNode = context.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(context.destination);

    // ScriptProcessorNode — deprecated but universally supported
    // TODO: migrate to AudioWorkletNode
    const processor = context.createScriptProcessor(4096, 1, 1);

    if (type === 'white') {
      processor.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < out.length; i++) {
          out[i] = Math.random() * 2 - 1;
        }
      };
    } else if (type === 'brown') {
      let last = 0;
      processor.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < out.length; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          out[i] = last * 3.5; // normalize
        }
      };
    } else if (type === 'pink') {
      // Paul Kellett 7-coefficient approximation
      let pb0 = 0,
        pb1 = 0,
        pb2 = 0,
        pb3 = 0,
        pb4 = 0,
        pb5 = 0,
        pb6 = 0;
      processor.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < out.length; i++) {
          const white = Math.random() * 2 - 1;
          pb0 = 0.99886 * pb0 + white * 0.0555179;
          pb1 = 0.99332 * pb1 + white * 0.0750759;
          pb2 = 0.969 * pb2 + white * 0.153852;
          pb3 = 0.8665 * pb3 + white * 0.3104856;
          pb4 = 0.55 * pb4 + white * 0.5329522;
          pb5 = -0.7616 * pb5 - white * 0.016898;
          out[i] = (pb0 + pb1 + pb2 + pb3 + pb4 + pb5 + pb6 + white * 0.5362) * 0.11;
          pb6 = white * 0.115926;
        }
      };
    }

    processor.connect(gainNode);
    sourceNode = processor;
  }

  function setVolume(volume: number) {
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  function tick() {
    const context = getCtx();
    if (context.state === 'suspended') {
      void context.resume();
    }

    const oscillator = context.createOscillator();
    const tickGain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    tickGain.gain.value = 0.05;

    oscillator.connect(tickGain);
    tickGain.connect(context.destination);

    const now = context.currentTime;
    oscillator.start(now);
    oscillator.stop(now + 0.02);
  }

  return { start, stop, setVolume, tick };
}
