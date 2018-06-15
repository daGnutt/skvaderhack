#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""template.py: A basic tempalte for CGI-work"""

import json
import os
import sys

RETURN_HEADERS = []

def __do_get():
    RETURN_HEADERS.append('Status: 403')
    return "This script is NOT get-able"

def __do_post():
    postdata = sys.stdin.read()
    try:
        postdata = json.loads(postdata)
    except json.JSONDecodeError:
        RETURN_HEADERS.append('Status: 400')
        return "Malformed Request. Data not JSON-decodable"
    RETURN_HEADERS.append('Status: 500')
    return "Not implemented"

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        RETURN_HEADERS.append('Status: 400')
        return "MISSING REQUEST_METHOD"

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    if os.environ['REQUEST_METHOD'] == 'POST':
        return __do_post()

    RETURN_HEADERS.append('Status: 400')
    return "Not implemented"

if __name__ == '__main__':
    RESPONSE = __main()
    for header in RETURN_HEADERS:
        print(header)
    print()
    print(RESPONSE)
