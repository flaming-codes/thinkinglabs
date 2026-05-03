import { PROJECTS_VIEW } from "../../src/frontend/thinkinglabs-ui/mocks";
import ProjectsListingPageComposition from "../../src/frontend/thinkinglabs-ui/pages/ProjectsListingPageComposition.astro";

const meta = {
  title: "Thinkinglabs/Pages/Projects Listing",
  component: ProjectsListingPageComposition,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    view: PROJECTS_VIEW,
  },
};

export default meta;

export const Default = {};
