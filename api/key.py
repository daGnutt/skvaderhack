#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""key.py: Handles the keysubmissions for groups"""

import json
import os
import sqlite3
import sys

import auth

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

    if 'action' in postdata and postdata['action'] == 'submitkey':
        return __submitkey(postdata)

    if 'action' in postdata and postdata['action'] == 'groupstatus':
        return __groupstatus(postdata)

    RETURN_HEADERS.append('Status: 500')
    return "Not implemented"

def __submitkey(postdata):
    if not 'authtoken' in postdata or not 'key' in postdata:
        RETURN_HEADERS.append('Status: 400')
        return "Missing required attributes"

    return submitkey(postdata['authtoken'], postdata['key'])

def submitkey(authtoken, key):
    """Verifies a key, and submits it. Returns the groups status"""
    group = auth.verify_token(authtoken)
    if group is None:
        RETURN_HEADERS.append('Status: 400')
        return "Invalid Authtoken, please relogin"

    _status = json.loads(groupstate(authtoken))
    if int(_status['remain_guess']) < 1:
        RETURN_HEADERS.append('Status: 400')
        return "You are not allowed to submit keys yet!"

    key = key.lower().strip()

    database = sqlite3.connect('database.sqlite3')
    submitted = database.execute(('SELECT count() FROM claims'
                                  ' WHERE groupname=:groupname AND key=:key'),
                                 {"groupname": group, "key": key}).fetchone()[0]

    if submitted != 0:
        RETURN_HEADERS.append('Status: 400')
        return "That key has already been submitted"

    badkey = database.execute(('SELECT count() FROM badkeys'
                               ' WHERE groupname=:groupname AND key=:key'),
                              {"groupname": group, "key": key}).fetchone()[0]

    if badkey != 0:
        RETURN_HEADERS.append('Status: 400')
        return "That key was wrong the last time you submitted it"

    keyexist = database.execute('SELECT count() FROM keys WHERE key=:key',
                                {'key': key}).fetchone()[0]
    if keyexist == 0:
        database.execute('INSERT INTO badkeys(groupname, key) values(:groupname, :key)',
                         {'groupname': group, 'key': key})
        database.commit()
        RETURN_HEADERS.append('Status: 400')
        return groupstate(authtoken)

    database.execute('INSERT INTO claims(groupname, key) values(:groupname, :key)',
                     {'groupname': group, 'key': key})
    database.commit()

    return json.dumps(_status)

def __groupstatus(request):
    if not 'authtoken' in request:
        RETURN_HEADERS.append('Status: 400')
        return "Missing Authtoken"

    status = groupstate(request['authtoken'])
    if status is None:
        RETURN_HEADERS.append('Status: 400')
        return "Authtoken is not valid. Please relogin"

    return status

def groupstate(authtoken):
    """Calculates the groups state, and returns it as a json-string"""
    group = auth.verify_token(authtoken)
    if group is None:
        return None

    database = sqlite3.connect('database.sqlite3')
    status = database.execute(('SELECT count(), datetime(min(submittime), "+10 minute")'
                               ' FROM badkeys WHERE'
                               ' groupname=:groupname AND '
                               ' submittime > datetime("now", "-10 minute")'),
                              {"groupname": group}).fetchone()

    returnvalue = {
        "group": group,
        "points": get_all_points(),
        "remain_guess": 3 - status[0],
        "time_to_new_guess": status[1]
    }

    return json.dumps(returnvalue)

def get_all_points():
    """Retrieves a calculated list of all groups points"""
    database = sqlite3.connect('database.sqlite3')
    allclaims = database.execute(('select cl.groupname, cl.catchtime, ke.key,'
                                  ' ke.first, ke.second, ke.third, ke.other'
                                  ' from claims as cl inner join keys as ke'
                                  ' on (ke.key == cl.key) order by ke.key asc, cl.catchtime asc;'))
    allrows = allclaims.fetchall()

    groups = {}
    key = None
    num_in_key = 0
    for row in allrows:
        _key = row[2]
        _group = row[0]
        _point1 = row[3]
        _point2 = row[4]
        _point3 = row[5]
        _point = row[6]

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
    for group in groups.keys():
        returnvalue.append({"name": group, "score": groups[group]});

    return returnvalue

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
