import os
import json
import string
import re
import nltk
from nltk.tree import Tree
from nltk.corpus import stopwords

# nltk.download("averaged_perceptron_tagger")
# nltk.download("maxent_ne_chunker")
# nltk.download("words")
# nltk.download("stopwords")

stop_words = stopwords.words()
typeArray = ["PER", "LOC", "ORG", "EVT", "WRK", "WVL", "CNC"]

"""Load text from a hardcoded file location
"""


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


def pipeline(text):
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

        ## convert nltk label to custom label
        label = convert_to_constant_label(label)

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


def replace_escape_sequences(input_string):
    input_string = "".join(re.findall(r'[A-Za-z!"%?´`\'#,;.:]+|\d+', input_string))
    input_string = input_string.replace("apos;", "'")
    return input_string


def process_annotation_data(file_key):
    path = "data//"
    file_path = path + file_key
    with open(file_path) as f:
        # text = json.load(f)
        text = str(f.read())
        tokens, annotation, POS, ENT = pipeline(text)
        tokens = [
            token
            for token in tokens
            if token not in string.punctuation and len(token) > 0
        ]

        curr_anno_tokens = []
        curr_anno_ids = []
        curr_anno_chars = []
        ER_labels = []

        return_dict = {
            "userAnnotations": [],
            "tokens": [],
            "size": 1,
            "users": ["7"],
            # "size": 4,
            # "users": ["7", "14", "15", "27"],
        }

        char_start = 0
        char_end = len(tokens[0])

        for i in range(len(tokens) - 1):
            token = replace_escape_sequences(tokens[i])
            token_entry = {
                "startOff": char_start,
                "endOff": char_end,
                "id": i,
                "text": token,
            }
            return_dict["tokens"].append(token_entry)

            if token in annotation.keys():
                if len(annotation[token]["Entity"]):
                    curr_anno_tokens.append(token)
                    curr_anno_ids.append(i)
                    ER_labels.append(annotation[token]["Entity"])
                    if len(curr_anno_chars):
                        curr_anno_chars[1] = char_end
                    else:
                        curr_anno_chars = [char_start, char_end]
                else:
                    if len(curr_anno_tokens):
                        return_dict["userAnnotations"].append(
                            {
                                "annotationTokens": curr_anno_ids,  # ids of tokens
                                "annotationColor": "#b6f2c6",
                                "userNo": "7",
                                "annotationType": ER_labels,
                                "borderTokens": {
                                    "1leftTokenSafe": True,
                                    "2rightTokenSafe": True,
                                },
                                "annotationText": " ".join(curr_anno_tokens),
                                "annotationChar": curr_anno_chars,  # start end end char_idx of first/last token respectively
                            }
                        )
                        curr_anno_tokens = []
                        curr_anno_ids = []
                        curr_anno_chars = []
                        ER_labels = []

            char_start = char_end + 1
            char_end = char_end + len(tokens[i + 1])

        return return_dict, annotation


def create_dummy_annotations(data_dict, annotation=None):
    import random
    import numpy as np

    hard_coded_users = data_dict["users"]

    userAnnotations = []
    tokens = data_dict["tokens"]
    # start_id = tokens[0]["id"]
    end_id = int(tokens[-1]["id"])
    half_max_shift = int(0.025 * (end_id + 1))

    unfinished = True
    curr_id = 0

    while unfinished:
        # curr_shift = random.randint(1, max_shift)
        new_anno = {
            "annotationTokens": [],  # ids of tokens
            "annotationColor": "#b6f2c6",
            "userNo": str(random.choice(hard_coded_users)),
            "annotationType": ["PER"],
            "borderTokens": {"1leftTokenSafe": True, "2rightTokenSafe": True},
            "annotationText": "",
            "annotationChar": [],  # start end end char_idx of first/last token respectively
        }
        curr_shift = int(np.random.normal(half_max_shift, half_max_shift))
        if curr_shift > 2 * half_max_shift:
            curr_shift = 2 * half_max_shift
        if curr_shift < 1:
            curr_shift = 1

        token_ids = []
        annotated_tokens = []
        ER_labels = []

        for i in range(curr_id, min(curr_id + curr_shift, end_id)):
            curr_token = tokens[i]["text"]
            if len(curr_token) == 0:
                continue

            token_ids.append(i)
            annotated_tokens.append(tokens[i]["text"])

            if curr_token in annotation:
                er_label = annotation[curr_token]["Entity"]
                if len(er_label) > 0:
                    ER_labels.append(er_label)

        if len(token_ids) > 0 and len(ER_labels) > 0:
            token_chars = [
                tokens[token_ids[0]]["startOff"],
                tokens[token_ids[-1]]["endOff"],
            ]

            new_anno["annotationTokens"] = token_ids
            new_anno["annotationText"] = " ".join(annotated_tokens)
            new_anno["annotationChar"] = token_chars
            new_anno["annotationType"] = ER_labels

            # print(new_anno)
            userAnnotations.append(new_anno)

        curr_id += curr_shift
        if curr_id >= end_id:
            unfinished = False

        # print(ER_labels)

    return userAnnotations


def convert_to_constant_label(labels):
    for i in range(len(labels)):
        for const_label in typeArray:
            if const_label in labels[i]:
                labels[i] = const_label

    return labels
