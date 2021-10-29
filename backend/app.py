from flask import Flask, render_template, json, request
from glob import glob
import pipeline

app = Flask(
    __name__,
    static_folder="../frontend/static",
    template_folder="../frontend/templates",
)

SESSION_FILE_PATH_KEY = ""
ANNOTATION_FILE = "data/live_data/annotation.json"


@app.route("/")
def index():

    return render_template("index.html", data={})


@app.route("/file_names", methods=["GET", "POST"])
def get_file_names():
    path = "data//"
    file_names = glob(path + "*.json") + glob(path + "*.txt")
    file_names = [f.split("\\")[1] for f in file_names]

    pipeline_names = ["Standard", "Stanza", "Both"]

    return {"file_names": file_names, "pipeline_names": pipeline_names}


@app.route("/retrieve_data", methods=["GET", "POST"])
def retrieve_data():
    global ANNOTATION_FILE
    global SESSION_FILE_PATH_KEY

    data_key = request.form["key"]
    pipeline_key = request.form["pipeline"]

    path = "data//"
    data_file = path + data_key

    # flag needed to determine whether existing annotation data has to be reset
    reset_annotation_data = False

    if ".txt" in data_key:
        # set flag to true if annotation data from previous usage exists already
        reset_annotation_data = True
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
            else:
                processed_file = "data/bt_debatte4.json"

    SESSION_FILE_PATH_KEY = processed_file

    with open(ANNOTATION_FILE, encoding="utf-8") as f:
        annotation_data = json.load(f)
        if SESSION_FILE_PATH_KEY in annotation_data:
            # handle the case where annotation data from previous usage exists already -> reset
            if reset_annotation_data:
                annotation_data[SESSION_FILE_PATH_KEY] = {
                    "live_annotations": {},
                    "meta_data": {
                        "offset": {},
                        "idArray": [],
                    },
                }
            annotation_data = annotation_data[SESSION_FILE_PATH_KEY]["live_annotations"]
        else:
            annotation_data = {}

        if reset_annotation_data:
            with open(ANNOTATION_FILE, "w") as output:
                json.dump(annotation_data, output, sort_keys=False, indent=4)

    return {"processed_data": data, "existing_store": annotation_data}


def preprocess(file_key, pipeline_key):

    test_data = pipeline.process_annotation_data(file_key, pipeline_key)

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


@app.route("/annotation_backend", methods=["GET", "POST"])
def annotation_to_backend():
    global ANNOTATION_FILE
    global SESSION_FILE_PATH_KEY

    live_annotations = request.form["serialized"]
    live_annotations = json.loads(live_annotations)

    with open(SESSION_FILE_PATH_KEY, encoding="utf-8") as f:
        processed_annotation_data = json.load(f)

    with open(ANNOTATION_FILE, encoding="utf-8") as f:
        prev_live_annotations = json.load(f)
        if SESSION_FILE_PATH_KEY not in prev_live_annotations.keys():
            prev_live_annotations[SESSION_FILE_PATH_KEY] = {
                "live_annotations": {},
                "meta_data": {
                    "offset": {},
                    "idArray": [],
                },
            }
        meta_data = prev_live_annotations[SESSION_FILE_PATH_KEY]["meta_data"]

    updated_annotations, meta_data = pipeline.process_live_annotation(
        processed_annotation_data, live_annotations, meta_data
    )

    with open(SESSION_FILE_PATH_KEY, "w") as output:
        json.dump(updated_annotations, output, sort_keys=False, indent=4)

    with open(ANNOTATION_FILE, "w") as output:
        live_data = {"live_annotations": live_annotations, "meta_data": meta_data}
        prev_live_annotations[SESSION_FILE_PATH_KEY] = live_data
        json.dump(prev_live_annotations, output, sort_keys=False, indent=4)

    return {
        "processed_data": updated_annotations,
        "existing_store": live_data["live_annotations"],
    }


if __name__ == "__main__":
    app.run(debug=True)
