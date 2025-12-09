import { createRoot, triggerRerender } from "./DSL-VDOM/core/vdom.hooks.js";
import App from "./src/app.js";
// import env from './env.json' with {type: 'json'}
import appRouter from "./router/index.js";

const app = createRoot(App, "#app", "App");
app.use(appRouter, (router) => {
    router.use(triggerRerender)
})
