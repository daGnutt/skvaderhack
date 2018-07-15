#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""template.py: A basic tempalte for CGI-work"""

import hashlib
import json
import os
import sqlite3
import sys
import uuid

from httperror import HTTPError

RETURN_HEADERS = []

def __do_get():
    """do_get() handles GET-requests"""
    RETURN_HEADERS.append('Status: 403')
    return "This script is NOT get-able"

def __do_post():
    """do_post() handles POST-requests"""
    postdata = sys.stdin.read()
    try:
        postdata = json.loads(postdata)
    except json.JSONDecodeError:
        raise HTTPError("Input data not JSON-decoable")

    if 'action' in postdata and postdata['action'] == 'login':
        return __performlogin(postdata)
    if 'action' in postdata and postdata['action'] == 'authtoken':
        return __verify_token(postdata)

    raise HTTPError("Unhandled Request")

def __performlogin(postdata):
    if not 'username' in postdata or \
            not 'password' in postdata:
        RETURN_HEADERS.append('Status: 400')
        return "Missing username or password"

    authtoken = login(postdata['username'], postdata['password'])
    return json.dumps(authtoken)

def login(groupname, password):
    """Tries to log in, returns a token if successful"""
    if not groupname or not password:
        raise HTTPError("Missing username or password")

    database = sqlite3.connect('database.sqlite3')
    result = database.execute(
        'SELECT salt, password FROM groups WHERE name = ?',
        (groupname, )).fetchone()

    if result is None:
        raise HTTPError("Group not found", 403)

    password_hash = hash_password(password, result[0])
    if password_hash == result[1]:
        token = create_authtoken(groupname)
        return token
    raise HTTPError("Incorrect groupname/password", 403)

def create_authtoken(groupname):
    """Genreates a new authtoken for the supplied groupname."""

    if not isinstance(groupname, str):
        raise TypeError('Groupname must be a string')

    database = sqlite3.connect('database.sqlite3')
    while True:
        token = generate_random()
        counter = database.execute(
            'SELECT count() FROM authtoken WHERE authtoken=?',
            (token,)).fetchone()[0]
        if counter == 0:
            break
    database.execute('INSERT INTO authtoken(groupname, authtoken) values(?, ?)', (groupname, token))
    database.commit()

    return token

def generate_random():
    """Generates a random identifier. Is probably unique"""
    return uuid.uuid4().hex

def hash_password(password, salt):
    """Hashes a password with the supplied salt, and returns the result"""
    hasher = hashlib.sha512()
    hasher.update(password.encode())
    hasher.update(salt.encode())
    return hasher.hexdigest()

def __verify_token(request):
    group = verify_token(request['token'])
    if group is None:
        raise HTTPError("Invalid Authtoken", 401)
    RETURN_HEADERS.append('Stauts: 200')
    return json.dumps(group)

def verify_token(token):
    """Verifies that the supplied token is valid. Expires old tokens.
       Returns groupname assoicated with the token"""
    database = sqlite3.connect('database.sqlite3')
    database.execute(
        ("DELETE FROM authtoken"
         " WHERE datetime(generated, '+4 days') < CURRENT_TIMESTAMP"))
    database.commit()
    groupname = database.execute("SELECT groupname FROM authtoken WHERE authtoken=?", (token,))
    groupname = groupname.fetchone()
    if groupname is None:
        return None
    return groupname[0]

def __main():
    if not 'REQUEST_METHOD' in os.environ:
        raise HTTPError("Missing REQUEST_METHOD")

    if os.environ['REQUEST_METHOD'] == 'GET':
        return __do_get()

    if os.environ['REQUEST_METHOD'] == 'POST':
        return __do_post()

    raise HTTPError("Unhandled REQUEST_METHOD")

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
        print("Status: 200")
    else:
        for header in RETURN_HEADERS:
            print(header)
    print()
    print(RESPONSE)
