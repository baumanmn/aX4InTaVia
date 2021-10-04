# from glob import glob
from pathlib import Path

from flask import render_template, json, request

from app import app
import pipeline


# @app.route("/aX4InTaVia/")
@app.route("/")
def index():
    return render_template("index.html", data={})


# @app.route("/aX4InTaVia/file_names", methods=["GET", "POST"])
@app.route("/file_names", methods=["GET", "POST"])
def get_file_names():
    data_path = Path("data")
    file_paths = list(data_path.glob("*.json")) + list(data_path.glob("*.txt"))
    file_names = [p.name for p in file_paths]
    pipeline_names = ["Standard", "Stanza", "Both"]
    return {"file_names": file_names, "pipeline_names": pipeline_names}


# @app.route("/aX4InTaVia/retrieve_data", methods=["GET", "POST"])
@app.route("/retrieve_data", methods=["GET", "POST"])
def retrieve_data():
    data_key = request.form["key"]
    pipeline_key = request.form["pipeline"]

    path = "data//"
    data_file = path + data_key

    if ".txt" in data_key:
        with open(data_file, encoding="utf-8") as f:
            processed_file = preprocess(data_key, pipeline_key)
            with open(processed_file, encoding="utf-8") as f:
                data = json.load(f)

    else:
        with open(data_file, encoding="utf-8") as f:
            data = json.load(f)
            if "userAnnotations" not in data.keys():
                processed_file = preprocess(data_key, pipeline_key)
                with open(processed_file, encoding="utf-8") as f:
                    data = json.load(f)

    return data


def preprocess(file_key, pipeline_key):

    test_data = pipeline.process_annotation_data(file_key, pipeline_key)

    processed_file = "data/processed_" + file_key.split(".")[0] + ".json"

    with open(processed_file, "w") as output:
        json.dump(test_data, output, sort_keys=False, indent=4)

    return processed_file


"""DEPRECATED"""

# MB check this
# @app.route("/get_text", methods=["POST"])
# def get_text():
#     tokens, annotation, POS, ENT = pipeline.pipeline()
#
#     return {
#         "text": tokens,
#         "annotation": annotation,
#         "POS": POS,
#         "ENT": ENT,
#     }
#
#
# if __name__ == "__main__":
#     app.run(debug=True)
