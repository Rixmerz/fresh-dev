import { createDefine } from "fresh";

// Shape of `ctx.state`, shared by middlewares, layouts and routes.
export interface State {
  user?: string;
}

export const define = createDefine<State>();
