import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "@/App";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <ToastContainer position="top-right" autoClose={3500} closeOnClick pauseOnHover pauseOnFocusLoss newestOnTop limit={3} />
  </React.StrictMode>,
);
