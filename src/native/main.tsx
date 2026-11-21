import React from "react";
import { createRoot } from "react-dom/client";
import MusicApp from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("ZuzuMusic root element missing");
createRoot(root).render(<React.StrictMode><MusicApp /></React.StrictMode>);
