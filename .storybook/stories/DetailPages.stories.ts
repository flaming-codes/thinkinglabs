import {
  CHANGED_MY_MIND_DETAIL,
  CHANGED_MY_MIND_DETAIL_SLOT,
  DECISION_DETAIL,
  DECISION_DETAIL_SLOT,
  PREDICTION_DETAIL,
  PREDICTION_DETAIL_SLOT,
  PROJECT_DETAIL,
  PROJECT_DETAIL_SLOT,
  QUESTION_DETAIL,
  QUESTION_DETAIL_SLOT,
} from "./DetailPageFixtures";
import DetailPageStory from "../../src/frontend/thinkinglabs-ui/storybook/DetailPageStory.astro";
import { fullscreen } from "./story-helpers";

const meta = {
  title: "Thinkinglabs/Pages/Detail Pages",
  component: DetailPageStory,
  parameters: fullscreen,
};

export default meta;

export const Project = {
  args: {
    story: "project",
    project: PROJECT_DETAIL,
    ...PROJECT_DETAIL_SLOT,
  },
};

export const Prediction = {
  args: {
    story: "prediction",
    prediction: PREDICTION_DETAIL,
    ...PREDICTION_DETAIL_SLOT,
  },
};

export const ChangedMyMind = {
  args: {
    story: "changed-my-mind",
    flip: CHANGED_MY_MIND_DETAIL,
    ...CHANGED_MY_MIND_DETAIL_SLOT,
  },
};

export const Decision = {
  args: {
    story: "decision",
    decision: DECISION_DETAIL,
    ...DECISION_DETAIL_SLOT,
  },
};

export const Question = {
  args: {
    story: "question",
    question: QUESTION_DETAIL,
    ...QUESTION_DETAIL_SLOT,
  },
};
