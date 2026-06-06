import { CurrentPercent } from './command.ts'
import { DelayPartKey, EnergyPartKey } from './parts.ts'
import { shiftingDelayRange } from './ranges.ts'
import { $selectedValues } from './store/choice.ts'
import { Axis } from './transforms.ts'

const armatureParts = [
  { title: 'left arm', key: 'leftArm' },
  { title: 'right arm', key: 'rightArm' },
  { title: 'left leg', key: 'leftLeg' },
  { title: 'right leg', key: 'rightLeg' },
]

export interface ChoiceOption {
  title: string
  key: string
  alts?: string[]
}

const toOptions = (...options: string[]): ChoiceOption[] =>
  options.map((option) => ({ title: option, key: option }))

export interface PercentStep {
  type: 'percent'
  max?: number
  current?: () => number
}

export interface ChoiceStep {
  type: 'choice'
  choices: ChoiceOption[]
  meta?: 'ordered'
}

export type Step = PercentStep | ChoiceStep

export const steps = {
  percent: { type: 'percent' },

  axes: {
    type: 'choice',
    choices: toOptions('x', 'y', 'z', 'all', 'reset'),
  },

  // select shifting relations part
  energyParts: {
    type: 'choice',
    choices: [
      { title: 'upper body', key: 'upper' },
      { title: 'lower body', key: 'lower' },
      { title: 'reset', key: 'reset' },
    ],
  },

  // select shifting relations part
  // ! SHIFTING RELATION SHOULD NOT INCLUDE [ALL] to prevent them being in sync
  shiftingParts: {
    type: 'choice',
    choices: [
      { title: 'left limbs', key: 'left' },
      { title: 'right limbs', key: 'right' },
      { title: 'body', key: 'body' },
    ],
  },

  // curveEquation: {
  //   type: 'choice',
  //   choices: [
  //     { title: '1. low pass', key: 'lowpass' },
  //     { title: '2. gaussian', key: 'gaussian' },
  //     { title: '3. derivative', key: 'derivative' },
  //     { title: '4. cap min', key: 'capMin' },
  //     { title: '5. cap max', key: 'capMax' },
  //   ],
  //   meta: 'ordered',
  // },

  curveParts: {
    type: 'choice',
    choices: [...toOptions('body'), ...armatureParts, ...toOptions('all')],
  },

  axisParts: {
    type: 'choice',
    choices: [...armatureParts, ...toOptions('all')],
  },

  dancerGender: {
    type: 'choice',
    choices: [
      { title: 'Male (ตัวพระ)', key: 'male' },
      { title: 'Female (ตัวนาง)', key: 'female' },
    ],
  },

  dancerChapter: {
    type: 'choice',
    choices: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
      title: `${n}`,
      key: `${n}`,
    })),
  },
} satisfies Record<string, Step>

export type StepKey = keyof typeof steps

export const choices = {
  dances: {
    title: 'dances',
    triggers: ['dances'],
    steps: [steps.dancerGender, steps.dancerChapter],
  },
  energy: {
    title: 'energy',
    triggers: ['energy'],
    steps: [
      steps.energyParts,
      {
        type: 'percent',
        max: 300,
        current() {
          const values = $selectedValues.get()

          return CurrentPercent.energy(values[0] as EnergyPartKey)
        },
      },
    ],
  },
  curve: {
    title: 'circle and curve',
    triggers: ['circle'],
    steps: [
      steps.curveParts,
      {
        type: 'percent',
        current: () => CurrentPercent.curve(),
      },
    ],
  },

  shifting: {
    title: 'shifting relations',
    triggers: ['shifting', 'synchronic', 'sync', 'relations'],
    steps: [
      steps.shiftingParts,
      {
        type: 'percent',
        max: shiftingDelayRange.maxPercent,
        current() {
          const values = $selectedValues.get()

          return CurrentPercent.shifting(values[0] as DelayPartKey)
        },
      },
    ],
  },
  space: {
    title: 'external body space',
    triggers: ['space'],
    steps: [
      {
        type: 'percent',
        current: () => CurrentPercent.space(),
      },
    ],
  },
  axis: {
    title: 'axis point',
    triggers: ['axis'],
    steps: [
      {
        type: 'percent',
        current: () => CurrentPercent.axis(),
        max: 120,
      },
    ],
  },
  rotations: {
    title: 'rotations',
    triggers: ['turn', 'rotation'],
    steps: [
      steps.axes,
      {
        type: 'percent',
        current() {
          const values = $selectedValues.get()

          if (values[0] === 'all' || values[0] === 'reset') return 0

          return CurrentPercent.rotations(values[0] as Axis)
        },
      },
    ],
  },
  speed: {
    title: 'speed',
    triggers: ['speed'],
    steps: [
      {
        type: 'percent',
        max: 300,
        current: () => CurrentPercent.speed(),
      },
    ],
  },
  reset: {
    title: 'reset',
    triggers: ['reset'],
    steps: [],
  },
} satisfies Record<string, Choice>

type Choices = typeof choices

export interface Choice {
  title: string
  triggers: string[]
  steps: Step[]
  hidden?: boolean
}

export type ChoiceKey = keyof Choices
