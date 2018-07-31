#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""adminkey.py: Returns all keys, hints and publishdates if request comes from whitelist IP."""

import json
import os
import sys
import sqlite3

from httperror import HTTPError

RETURN_HEADERS = []

def __do_get():
    if os.environ['REMOTE_ADDR'] == "172.16.0.254":
        database = sqlite3.connect("database.sqlite3")
        allinfo = database.execute((
                "SELECT key, hint_publish, hint_url, hint_description,"
                " first, second, third, other"
                " FROM keys"
                " ORDER BY hint_publish, hint_description"
                ))
        allhints = allinfo.fetchall()
        rrows = []
        for row in allhints:
            rrows.append({
                "key": row[0],
                "publish": row[1],
                "url": row[2],
                "description": row[3],
                "scores": [row[4], row[5], row[6], row[7]]
            })
        return json.dumps(rrows)
    else:
        raise HTTPError("Not whitelisted IP")

def __do_post():
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

    raise HTTPError("Undhandled REQUEST_METHOD")

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
