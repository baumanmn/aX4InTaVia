from flask import Flask, render_template, json, request
import pipeline

app = Flask(
    __name__,
    static_folder="../frontend/static",
    template_folder="../frontend/templates",
)


@app.route("/")
def index():
    # test_file = "data/test.json"

    # test_data = pipeline.create_data()

    # with open(test_file, "w") as output:
    #     json.dump(test_data, output, sort_keys=False, indent=4)

    return render_template("index.html", data={})


@app.route("/retrieve_data", methods=["GET", "POST"])
def retrieve_data():
    data_key = request.form["key"]
    if data_key == "bt_debatte4":
        data_file = "data/bt_debatte4.json"
    else:
        data_file = preprocess(data_key)

    with open(data_file) as f:
        data = json.load(f)
        return data


def preprocess(file_key):
    processed_file = "data/processed.json"

    test_data, annotation = pipeline.process_annotation_data(file_key)
    user_annotations = pipeline.create_dummy_annotations(test_data, annotation)

    test_data["userAnnotations"] = user_annotations

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
