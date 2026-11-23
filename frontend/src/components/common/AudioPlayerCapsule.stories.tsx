import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AudioPlayerCapsule } from './AudioPlayerCapsule';

const voice = {
  voiceURI: 'vi-VN-voice',
  name: 'Giọng tiếng Việt',
  lang: 'vi-VN',
  localService: true,
  default: true,
} as SpeechSynthesisVoice;

const meta: Meta<typeof AudioPlayerCapsule> = {
  title: 'Common/AudioPlayerCapsule',
  component: AudioPlayerCapsule,
  args: {
    reliability: 'reliable',
    voices: [voice],
    selectedVoiceURI: voice.voiceURI,
    hasVietnameseVoice: true,
    rate: 1,
    progressLabel: 'Đoạn 2 / 5',
    onPlay: fn(),
    onPause: fn(),
    onResume: fn(),
    onStop: fn(),
    onRateCycle: fn(),
    onVoiceChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AudioPlayerCapsule>;

export const Idle: Story = { args: { status: 'idle' } };
export const Speaking: Story = { args: { status: 'speaking' } };
export const Paused: Story = { args: { status: 'paused' } };
export const Unsupported: Story = { args: { status: 'unsupported' } };
