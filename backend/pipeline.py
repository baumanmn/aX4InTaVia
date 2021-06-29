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

    processed_text = []

    ent_chunks = []
    ent_labels = []

    token_entity_pairs = []

    # annotation_dict = {}
    # POS_dict = {}
    # ENT_dict = {}

    for s in sentences:
        tokens = nltk.word_tokenize(s)
        tokens = [clean_word(token) for token in tokens]
        tokens = [t for t in tokens if len(t) > 0]
        processed_text.append(tokens)
        tags = nltk.pos_tag(tokens)

        # annotate each token with its pos tag
        # for t, pos in tags:

        # if len(remove_chunk(t)) == 0:
        # annotation_dict[t] = {"POS": "", "Entity": ""}
        # continue

        # annotation_dict[t] = {"POS": pos, "Entity": ""}

        # if pos in POS_dict.keys():
        # if t not in POS_dict[pos]:
        # POS_dict[pos].append(t)
        # else:
        # POS_dict[pos] = [t]

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
            token_label = None
            for k in range(len(chunks)):
                curr_chunk = chunks[k]
                curr_chunk = curr_chunk.split(" ")
                if token in curr_chunk:
                    idx = k
                    label = ent_labels[i][idx]
                    # annotation_dict[token]["Entity"] = label

                    token_label = label

                    # if label in ENT_dict.keys():
                    # if token not in ENT_dict[label]:
                    # ENT_dict[label].append(token)
                    # else:
                    # ENT_dict[label] = [token]

            token_entity_pairs.append((token, token_label))

    processed_text = sum(processed_text, [])

    return processed_text, token_entity_pairs
    # return processed_text, annotation_dict, POS_dict, ENT_dict


def pipeline2(text):
    import stanza

    nlp = stanza.Pipeline("en")
    processed_text = []
    token_entity_pairs = []

    sentences = nltk.sent_tokenize(text)
    for s in sentences:
        tokens = nltk.word_tokenize(s)
        tokens = [clean_word(t) for t in tokens]
        tokens = [t for t in tokens if len(t) > 0]
        processed_text.append(tokens)
        doc = nlp(" ".join(tokens))
        # print(doc.entities)

        if len(doc.entities) > 0:
            curr_ent = 0
            n = len(doc.entities)
            for t in tokens:
                l = None
                for i in range(curr_ent, n):
                    ent = doc.entities[i]
                    curr_ent = i
                    texts = ent.text.split(" ")
                    if t in texts:
                        l = ent.type
                        break

                token_entity_pairs.append((t, l))

        # for tuple in token_entity_pairs:
        # if tuple[1] is not None:
        # print(tuple)
    processed_text = sum(processed_text, [])
    return processed_text, token_entity_pairs


def remove_chunk(token):
    if token in stop_words:
        return ""

    return token.translate(str.maketrans("", "", string.punctuation))


def replace_escape_sequences(input_string):
    input_string = "".join(re.findall(r'[A-Za-z!"%?´`\'#,;.:]+|\d+', input_string))
    input_string = input_string.replace("apos;", "'")
    return input_string


def clean_word(
    w, lower_case=False, remove_punct=True, remove_digits=False, replace_escape=True
):
    if w.isspace():
        return w

    w = w.strip()

    if lower_case == True:
        w = w.lower()

    if remove_punct == True:
        w = re.sub("[" + string.punctuation + "]", "", w)

    if remove_digits == True:
        w = "".join([c for c in w if not c.isdigit()])

    if replace_escape == True:
        w = replace_escape_sequences(w)

    return w


def process_annotation_data(file_key, pipeline_key):
    path = "data//"
    file_path = path + file_key
    with open(file_path) as f:
        # text = json.load(f)
        text = str(f.read())

        if pipeline_key == "NLTK":
            tokens, token_entity_pairs = pipeline(text)
        else:
            tokens, token_entity_pairs = pipeline2(text)
        # print(token_entity_pairs)
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

        for i in range(len(token_entity_pairs) - 1):
            token_pair = token_entity_pairs[i]
            token = token_pair[0]
            # token = replace_escape_sequences(token_pair[0])
            # token = clean_word(token)
            token_entry = {
                "startOff": char_start,
                "endOff": char_end,
                "id": i,
                "text": token,
            }

            return_dict["tokens"].append(token_entry)

            token_label = token_pair[1]

            if token_label is not None:
                curr_anno_tokens.append(token)
                curr_anno_ids.append(i)
                ER_labels.append(token_label)
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
            char_end = char_end + len(token_entity_pairs[i + 1][0])

        return return_dict


def convert_to_constant_label(labels):
    for i in range(len(labels)):
        for const_label in typeArray:
            if const_label in labels[i]:
                labels[i] = const_label

    return labels
