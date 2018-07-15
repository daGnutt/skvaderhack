#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""template.py: A basic tempalte for CGI-work"""

import json
import os
import sqlite3

import key

RETURN_HEADERS = []

def __do_get():
    RETURN_HEADERS.append('Status: 200')
    scores = key.get_all_points()
    return json.dumps(scores)

def scorelist():
    """Retrieves a calculated list of all groups points"""
    database = sqlite3.connect("database.sqlite3")
    claimcursor = database.execute(("SELECT cl.groupname, cl.catchtime,"
                                    " ke.key, ke.first, ke.second, ke.third, ke.other"
                                    " FROM claims AS cl INNER JOIN keys AS ke"
                                    " ON (ke.key == cl.key COLLATE NOCASE)"
                                    " ORDER BY ke.key ASC, cl.catchtime ASC"))
    allclaims = claimcursor.fetchall()

    groups = {}
    key = None
    for claim in allclaims:
        _group = claim[0]
        _key = claim[2]
        _point1 = claim[3]
        _point2 = claim[4]
        _point3 = claim[5]
        _point = claim[6]

        if _key != key:
            num_in_key = 0
            key = _key

        if not _group in groups:
            groups[_group] = 0

        num_in_key = num_in_key + 1

        if num_in_key == 1:
            groups[_group] = groups[_group] + _point1
        elif num_in_key == 2:
            groups[_group] = groups[_group] + _point2
        elif num_in_key == 3:
            groups[_group] = groups[_group] + _point3
        else:
            groups[_group] = groups[_group] + _point

    returnvalue = []
    for group in groups:
        returnvalue.append({"name": group, "score": groups[group]})

    return returnvalue

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
