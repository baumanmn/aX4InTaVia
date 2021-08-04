import os
import json
import string
import re
import stanza
import nltk
from nltk.tree import Tree
from nltk.corpus import stopwords

# stanza.download('en')
# nltk.download("averaged_perceptron_tagger")
# nltk.download("maxent_ne_chunker")
# nltk.download("words")
# nltk.download("stopwords")
# nltk.donwload("punkt")

stop_words = stopwords.words()
typeArray = ["PER", "LOC", "ORG", "EVT", "WRK", "WVL", "CNC"]


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


def produce_tokens(text):
    processed_text = []
    processed_text_as_list = []

    # text = text.encode().decode("unicode-escape")
    # text = html.unescape(text)
    # text = " ".join(re.findall(r"[\w%\-.']+", text))
    sentences = nltk.sent_tokenize(text)

    for s in sentences:
        tokens = nltk.word_tokenize(s)
        tokens = [clean_word(token) for token in tokens]
        tokens = [t for t in tokens if len(t) > 0]
        tokens = join_punct(tokens)
        tokens = tokens + [" "]
        processed_text.append(tokens)
        processed_text_as_list += tokens

    # processed_text_as_list = join_punct(processed_text_as_list)

    return processed_text, processed_text_as_list


def standard_tagger(sentences):
    ent_chunks = []

    ent_labels = []

    token_entity_pairs = []

    for s in sentences:
        tags = nltk.pos_tag(s)

        chunks, label = get_continuous_chunks(tags)

        ent_chunks.append(chunks)

        ## convert nltk label to custom label
        label = convert_to_constant_label(label)

        ent_labels.append(label)

    # annotate every component of a continuous chunk with its respective ent. tag
    for i in range(len(sentences)):
        chunks = ent_chunks[i]
        for j in range(len(sentences[i])):
            token = sentences[i][j]
            token_label = None
            for k in range(len(chunks)):
                curr_chunk = chunks[k]
                curr_chunk = curr_chunk.split(" ")
                if token in curr_chunk:
                    idx = k
                    label = ent_labels[i][idx]

                    token_label = label

            token_entity_pairs.append((token, token_label))

    return token_entity_pairs


def stanza_tagger(sentences):
    nlp = stanza.Pipeline("en")

    token_entity_pairs = []

    for s in sentences:

        doc = nlp(" ".join(s))

        if len(doc.entities) > 0:
            curr_ent = 0
            n = len(doc.entities)
            for t in s:
                l = None
                for i in range(curr_ent, n):
                    ent = doc.entities[i]
                    curr_ent = i
                    texts = ent.text.split(" ")
                    if t in texts:
                        l = ent.type
                        break

                token_entity_pairs.append((t, l))

    return token_entity_pairs


def remove_chunk(token):
    if token in stop_words:
        return ""

    return token.translate(str.maketrans("", "", string.punctuation))


def replace_escape_sequences(input_string):
    input_string = "".join(re.findall(r'[A-Za-z!"%?´`\'#,;.:]+|\d+', input_string))
    input_string = input_string.replace("apos;", "'")
    return input_string


def clean_word(
    w, lower_case=False, remove_punct=False, remove_digits=False, replace_escape=True
):
    if w.isspace():
        return ""

    w = w.encode().decode("unicode-escape")

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


def join_punct(word_list):
    new_word_list = []
    for i in range(len(word_list) - 1):
        word = word_list[i]
        next_word = word_list[i + 1]

        if word in string.punctuation:
            continue
        if next_word in string.punctuation:
            word += next_word

        new_word_list.append(word)

    return new_word_list


def process_annotation_data(file_key, pipeline_key):
    path = "data//"
    file_path = path + file_key
    with open(file_path) as f:
        # text = json.load(f)
        text = str(f.read())

        tokens, tokens_as_list = produce_tokens(text)

        if pipeline_key == "Standard" or pipeline_key == "Both":
            token_entity_pairs = standard_tagger(tokens)

        if pipeline_key == "Stanza" or pipeline_key == "Both":
            token_entity_pairs2 = stanza_tagger(tokens)

        # token_entity_pairs = standard_tagger(tokens)
        # token_entity_pairs2 = stanza_tagger(tokens)

        tokens = [
            token
            for token in tokens_as_list
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
            "users": ["5", "7"],
            # "size": 4,
            # "users": ["7", "14", "15", "27"],
        }

        if pipeline_key == "Standard" or pipeline_key == "Both":

            char_start = 0
            char_end = len(tokens[0])

            for i in range(len(token_entity_pairs) - 1):
                token_pair = token_entity_pairs[i]
                token = token_pair[0]
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

        if pipeline_key == "Stanza" or pipeline_key == "Both":

            curr_anno_tokens = []
            curr_anno_ids = []
            curr_anno_chars = []
            ER_labels = []

            char_start = 0
            char_end = len(tokens[0])

            for i in range(len(token_entity_pairs2) - 1):
                token_pair = token_entity_pairs2[i]

                token = token_pair[0]

                if pipeline_key != "Both":
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
                                "userNo": "5",
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
                char_end = char_end + len(token_entity_pairs2[i + 1][0])

        return return_dict


def convert_to_constant_label(labels):
    for i in range(len(labels)):
        for const_label in typeArray:
            if const_label in labels[i]:
                labels[i] = const_label

    return labels


def split_into_words(
    input_sequence,
    lower_case=False,
    remove_punct_only=True,
    remove_digits=False,
    replace_escape=True,
    remove_stop_words=False,
    remove_umlt=False,
):
    if len(input_sequence) == 0:
        return []

    processed = []
    sequence = input_sequence.replace(",", " ")
    sequence = re.split(r"\s", sequence)
    sequence = [separate_strings_and_digits(word) for word in sequence]
    sequence = sum(sequence, [])

    for w in sequence:
        if len(w) == 0:
            continue

        if "http" in w:
            continue

        w = w.strip()

        if lower_case == True:
            w = w.lower()

        if remove_stop_words == True:
            if w in stop_words:
                continue

        if replace_escape == True:
            if w.isdigit() == False:
                w = replace_escape_sequences(w)

        if remove_punct_only == True:
            remove = True
            for c in w:
                if c not in string.punctuation:
                    remove = False
                    break

            if remove == True:
                continue

        if w.isspace() or not w:
            continue
        else:
            processed.append(w)

    return processed


def separate_strings_and_digits(input_sequence):
    components = []
    curr_string = ""
    is_string = True
    for c in input_sequence:
        if c.isdigit():
            if is_string == True:
                components.append(curr_string)
                curr_string = ""
                is_string = False
        else:
            if is_string == False:
                components.append(curr_string)
                curr_string = ""
                is_string = True
        curr_string += c

    if len(curr_string) > 0:
        components.append(curr_string)

    return components
