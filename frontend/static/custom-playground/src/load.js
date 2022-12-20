import { setStore } from "./store.js";

const loadBtn = document.getElementById("load");
const pathTo = "http://localhost:3000/data";

loadBtn.onclick = () => {
  fetch(pathTo)
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      setStore(data);
    });
};
