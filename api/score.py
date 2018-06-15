#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""template.py: A basic tempalte for CGI-work"""

import json
import os
import sys

import key

RETURN_HEADERS = []

def __do_get():
    RETURN_HEADERS.append('Status: 200')
    scores = key.get_all_points()
    return json.dumps(scores);

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        RETURN_HEADERS.append('Status: 400')
        return "MISSING REQUEST_METHOD"

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    RETURN_HEADERS.append('Status: 400')
    return "Not implemented"

if __name__ == '__main__':
    RESPONSE = __main()
    for header in RETURN_HEADERS:
        print(header)
    print()
    print(RESPONSE)
