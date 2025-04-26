import { Routes as ReactRouterRoutes, Route } from "react-router-dom";

import HomePage from "./pages/index";
import NotFound from "./pages/NotFound";
import BundlesList from "./pages/bundles";
import BundleCreate from "./pages/bundles/new";
import BundleEdit from "./pages/bundles/[id]";

export default function Routes() {
  return (
    <ReactRouterRoutes>
      <Route path="/" element={<HomePage />} />
      <Route path="/bundles" element={<BundlesList />} />
      <Route path="/bundles/new" element={<BundleCreate />} />
      <Route path="/bundles/:id" element={<BundleEdit />} />
      <Route path="*" element={<NotFound />} />
    </ReactRouterRoutes>
  );
} 