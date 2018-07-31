#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""template.py: A basic template for CGI-work"""

import json
import os
import sys

from httperror import HTTPError

RETURN_HEADERS = []

def __do_get():
    raise HTTPError("This script is not GET-able", 405)

def __do_post():
    raise HTTPError("This script is not POST-able", 405)
    postdata = sys.stdin.read()
    try:
        postdata = json.loads(postdata)
    except json.JSONDecodeError:
        raise HTTPError("Malformed Request. Data is not JSON-decodable")

    raise HTTPError("Undhandled POST request", 500)

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        raise HTTPError("Missing REQUEST_METHOD")

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    if os.environ['REQUEST_METHOD'] == 'POST':
        return __do_post()

    raise HTTPError("Undhandled REQUEST_METHOD", 405)

if __name__ == '__main__':
    try:
        RESPONSE = __main()
    except HTTPError as err:
        if err.status:
            RETURN_HEADERS.append('Status: %d' % err.status)
        else:
            RETURN_HEADERS.append('Status: 400')
        RESPONSE = err.message

    NUM_HEADERS = len(RETURN_HEADERS)
    if NUM_HEADERS == 0:
        print('Status: 200')
    else:
        for header in RETURN_HEADERS:
            print(header)
    print('Content-Length: %d' % len(RESPONSE))
    print()
    print(RESPONSE)
