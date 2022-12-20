import { store } from "./store.js";

const saveBtn = document.getElementById("save");
const pathTo = "http://localhost:3000/data";

saveBtn.onclick = () => {
  fetch(pathTo, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store),
  });
};
