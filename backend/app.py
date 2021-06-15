from flask import Flask, render_template, json, request
from glob import glob
import pipeline

app = Flask(
    __name__,
    static_folder="../frontend/static",
    template_folder="../frontend/templates",
)


@app.route("/")
def index():

    return render_template("index.html", data={})


@app.route("/file_names", methods=["GET", "POST"])
def get_file_names():
    path = "data//"
    file_names = glob(path + "*.json") + glob(path + "*.txt")
    file_names = [f.split("\\")[1] for f in file_names]

    return {"file_names": file_names}


@app.route("/retrieve_data", methods=["GET", "POST"])
def retrieve_data():
    path = "data//"
    data_key = request.form["key"]
    data_file = path + data_key

    if ".txt" in data_key:
        with open(data_file) as f:
            processed_file = preprocess(data_key)
            with open(processed_file) as f:
                data = json.load(f)

    else:
        with open(data_file) as f:
            data = json.load(f)
            if "userAnnotations" not in data.keys():
                processed_file = preprocess(data_key)
                with open(processed_file) as f:
                    data = json.load(f)

    return data


def preprocess(file_key):

    test_data, annotation = pipeline.process_annotation_data(file_key)

    processed_file = "data/processed_" + file_key.split(".")[0] + ".json"

    with open(processed_file, "w") as output:
        json.dump(test_data, output, sort_keys=False, indent=4)

    return processed_file


"""DEPRECATED"""


@app.route("/get_text", methods=["POST"])
def get_text():
    tokens, annotation, POS, ENT = pipeline.pipeline()

    return {
        "text": tokens,
        "annotation": annotation,
        "POS": POS,
        "ENT": ENT,
    }


if __name__ == "__main__":
    app.run(debug=True)
