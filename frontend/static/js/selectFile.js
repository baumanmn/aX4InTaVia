import * as d3 from "d3";
import { initChart } from "./entry";
import $ from "jquery";

export function initSelectFile() {
  //form
  var body = d3.select("body");
  var container = body.append("div").attr("id", "selectFileDiv");
  container
    .append("h1")
    .text(
      "AnnoXplorer: A Scalable, Integrated Approach for the Visual Analysis of Text Annotations"
    );
  container.append("h2").text("Upload JSON file or select from list");

  container.append("input").attr("type", "file").attr("id", "input");

  //list
  var ul = container.append("ul");

  //List of files
  // var fileList = [
  //   "werther.json",
  //   "bt_debatte4.json",
  //   "dump.json",
  //   "dump3user.json",
  //   "dump_simple.json",
  // ];
  $.ajax({
    type: "POST",
    url: "/file_names",
    data: {},
    dataType: "json",
    success: function (results) {
      let data = results["file_names"];
      data.forEach(function (file) {
        ul.append("li")
            .text(file)
            .attr("class", "liList")
            .on("click", function () {
              clickFile(file);
            });
      });
    },
  });

  //form on change event binding
  const inputElement = document.getElementById("input");
  inputElement.addEventListener("change", handleFile, false);

  function clickFile(file) {
    d3.select("#selectFileDiv").remove();
    let fetch_data = {key: file};

    $.ajax({
    type: "POST",
    url: "/retrieve_data",
    data: fetch_data,
    dataType: "json",
    success: function (results) {
      var data = results;
      console.log(data);
      initChart(data);
      }
    });
  }

  function handleFile() {
    var selectedFile = window.URL.createObjectURL(
      document.getElementById("input").files[0]
    );
    d3.select("#selectFileDiv").remove();
    initChart(selectedFile);
  }
}
