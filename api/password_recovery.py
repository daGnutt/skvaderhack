#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""password_recovery.py: A CGI endpoint for handling password recovery"""

import json
import os
import sys
import sqlite3

import auth
import groups
import sendemail

from httperror import HTTPError

RETURN_HEADERS = []

def __do_get():
    raise HTTPError("This script is NOT GET-able", 403)

def __do_post():
    postdata = sys.stdin.read()
    try:
        postdata = json.loads(postdata)
    except json.JSONDecodeError:
        raise HTTPError("Malformed Request. Data not JSON-decodable")

    if 'action' in postdata and postdata['action'] == "request_token":
        return __get_token(postdata)

    if 'action' in postdata and postdata['action'] == 'reset_password':
        return __reset_password(postdata)

    raise HTTPError("Not Implemented", 500)

def __get_token(request):
    if not 'email' in request:
        raise HTTPError("Missing email")

    try:
        token = get_token(request['email'])
        if token == None:
            raise HTTPError("No such recipient")
        send_token(request['email'], token)
        return ""
    except ValueError as err:
        raise HTTPError(err.args[0])

def get_token(email):
    """Recieves a new password recovery token for the email address"""
    database = sqlite3.connect('database.sqlite3')

    exists = database.execute("SELECT count() FROM groups WHERE contact_email=?", (email,)).fetchone()[0]
    if exists == 0:
        return None

    while True:
        token = auth.generate_random()
        count = database.execute("SELECT count() FROM password_recovery WHERE email=? AND token=?",
                                 (email, token)).fetchone()[0]
        if count == 0:
            break

    database.execute("INSERT INTO password_recovery(email, token) values(?,?)",
                     (email, token))
    database.commit()
    return token

def send_token(email, token):
    """Creates a email to the recipient with the token"""
    with open("templates/email_password_recovery.txt", mode="r") as file_pointer:
        string = file_pointer.read()

    string = string % (token, email, token)
    sendemail.send_email(email, "Skvaderhack Password Recovery", string, "baron@skvaderhack.xyz")

def __reset_password(request):
    try:
        reset_password(request['email'], request['token'], request['password'])
        group = groups.find_group_by_email(request['email'])
        token = auth.login(group, request['password'])
        return json.dumps(token)

    except ValueError as err:
        raise HTTPError(err.args[0])

def reset_password(email, token, password):
    """Uses a token/email combination to set a password"""
    if not password:
        raise ValueError("Password must be specified")
    database = sqlite3.connect('database.sqlite3')
    database.execute(("DELETE FROM password_recovery"
                      " WHERE datetime(generated, '+15 minute') < CURRENT_TIMESTAMP"))
    database.commit()

    count = database.execute(("SELECT count() FROM password_recovery"
                              " WHERE email=:email AND token=:token"),
                             {"email": email, "token": token}).fetchone()[0]
    if not count == 1:
        raise ValueError("Incorrect email/token combination")

    salt = database.execute("SELECT salt FROM groups WHERE contact_email=?", (email,)).fetchone()
    if salt is None:
        raise ValueError("Could not find salt for email")
    salt = salt[0]

    password_hash = auth.hash_password(password, salt)
    database.execute("UPDATE groups SET password=:password WHERE contact_email=:email",
                     {"password": password_hash, "email": email})
    database.execute("DELETE from password_recovery WHERE token=:token", {"token": token})
    database.commit()

    return password_hash

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
