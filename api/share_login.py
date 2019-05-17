#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""share_login.py: A framework for users to share their login"""

import json
import os
import sys

import auth
import resources
import sendemail

from httperror import HTTPError

RETURN_HEADERS = []

def send_magic_link(authtoken, recipient):
    """Sends a new authtoken to the supplied recipient"""
    if not (isinstance(authtoken, str) and isinstance(recipient, str)):
        raise TypeError("All authtoken and recipient must be strings")

    if resources.verify_email(recipient) is False:
        raise HTTPError("Bad Email Address")

    groupname = auth.verify_token(authtoken)
    if groupname is None:
        raise HTTPError("Bad authtoken", 401)

    newtoken = auth.create_authtoken(groupname)

    with open("templates/email_magic_link.txt", mode="r") as file_pointer:
        message = file_pointer.read()
    message = message % (groupname, newtoken)
    subject = "Skvaderhack Login for %s" % (groupname,)
    sender = "baron@skvaderhack.xyz"
    sendemail.send_email(recipient, subject, message, sender)

def claim_share_qr(authtoken):
    groupinfo = auth.verify_token(request, extra_data=True)
    if groupinfo is None:
        raise HTTPError("Bad Authtoken")
    newtoken = auth.create_authtoken(groupinfo["name"], generate_time=groupinfo["authtime"])
    return newtoken

def generate_qr_link(authtoken):
    pass

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
