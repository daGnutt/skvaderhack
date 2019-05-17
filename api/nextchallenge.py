#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""nextchallenge.py: Fetches the next planned drop"""

import json
import os
import sqlite3
import sys

from httperror import HTTPError

RETURN_HEADERS = []

def next_challengedrop():
    """Retrieves the next challengedrop"""
    database = sqlite3.connect('database.sqlite3')
    next_drop = database.execute(("SELECT hint_publish FROM keys"
                                  " WHERE hint_publish > CURRENT_TIMESTAMP"
                                  " ORDER BY hint_publish"
                                  " LIMIT 1"))
    drop = next_drop.fetchone()[0]
    return drop

def __do_get():
    next_drop = next_challengedrop()
    return json.dumps(next_drop)

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        raise HTTPError("Missing REQUEST_METHOD")

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

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
