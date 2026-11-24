import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LessonStepper } from './LessonStepper';

const meta: Meta<typeof LessonStepper> = {
  title: 'Phonics/LessonStepper',
  component: LessonStepper,
  args: {
    totalSteps: 5,
    onStepClick: fn(),
  },
};

export default meta;

export const StepOne: StoryObj<typeof LessonStepper> = { args: { currentStep: 1 } };
export const StepThree: StoryObj<typeof LessonStepper> = { args: { currentStep: 3 } };
export const Completed: StoryObj<typeof LessonStepper> = { args: { currentStep: 5 } };
