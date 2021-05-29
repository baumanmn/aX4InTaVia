import os
import json
import nltk
import string
from nltk.tree import Tree
from nltk.corpus import stopwords

nltk.download("averaged_perceptron_tagger")
nltk.download("maxent_ne_chunker")
nltk.download("words")
nltk.download("stopwords")

stop_words = stopwords.words()

"""Load text from a hardcoded file location
"""


def load_text():
    file_location = "data//"

    file_name = "data.json"

    file_path = os.path.join(file_location, file_name)

    with open(file_path) as f:
        data = json.load(f)
        text = data["0"]["content"]

    return text


"""Retrieve continuous entity chunks given text token and their POS tags
"""


def get_continuous_chunks(pos_tags):
    chunked = nltk.ne_chunk(pos_tags)
    prev = None
    continuous_chunk = []
    current_chunk = []
    labels = []

    for chunk in chunked:
        if type(chunk) == Tree:
            labels.append(chunk.label())
            current_chunk.append(" ".join([token for token, pos in chunk.leaves()]))
        elif current_chunk:
            named_entity = " ".join(current_chunk)
            if named_entity not in continuous_chunk:
                continuous_chunk.append(named_entity)
                current_chunk = []
        else:
            continue

    if continuous_chunk:
        named_entity = " ".join(current_chunk)
        if named_entity not in continuous_chunk and len(named_entity) > 0:
            continuous_chunk.append(named_entity)

    return continuous_chunk, labels


"""preprocessing pipeline: sentence split --> tokenize --> pos tag + ent. tag
"""


def pipeline():
    text = load_text()
    sentences = nltk.sent_tokenize(text)

    ent_chunks = []

    processed_text = []
    ent_labels = []

    annotation_dict = {}
    POS_dict = {}
    ENT_dict = {}

    for s in sentences:
        tokens = nltk.word_tokenize(s)
        processed_text.append(tokens)
        tags = nltk.pos_tag(tokens)

        # annotate each token with its pos tag
        for t, pos in tags:

            if len(remove_chunk(t)) == 0:
                annotation_dict[t] = {"POS": "", "Entity": ""}
                continue

            annotation_dict[t] = {"POS": pos, "Entity": ""}

            if pos in POS_dict.keys():
                if t not in POS_dict[pos]:
                    POS_dict[pos].append(t)
            else:
                POS_dict[pos] = [t]

        # retrieve entities
        chunks, label = get_continuous_chunks(tags)

        ent_chunks.append(chunks)
        ent_labels.append(label)

    # annotate every component of a continuous chunk with its respective ent. tag
    for i in range(len(processed_text)):
        chunks = ent_chunks[i]
        for j in range(len(processed_text[i])):
            token = processed_text[i][j]
            for k in range(len(chunks)):
                curr_chunk = chunks[k]
                curr_chunk = curr_chunk.split(" ")
                if token in curr_chunk:
                    idx = k
                    label = ent_labels[i][idx]
                    annotation_dict[token]["Entity"] = label

                    if label in ENT_dict.keys():
                        if token not in ENT_dict[label]:
                            ENT_dict[label].append(token)
                    else:
                        ENT_dict[label] = [token]

    processed_text = sum(processed_text, [])

    return processed_text, annotation_dict, POS_dict, ENT_dict


def remove_chunk(token):
    if token in stop_words:
        return ""

    return token.translate(str.maketrans("", "", string.punctuation))


def create_data():
    tokens, annotation, POS, ENT = pipeline()

    return_dict = {
        "tokens": [],
        "size": 4,
    }

    char_start = 0
    char_end = len(tokens[0])

    for i in range(len(tokens) - 1):
        token = tokens[i]
        token_entry = {
            "startOff": char_start,
            "endOff": char_end,
            "id": i,
            "text": token,
        }
        return_dict["tokens"].append(token_entry)

        char_start = char_end + 1
        char_end = char_end + len(tokens[i + 1])

    return return_dict
