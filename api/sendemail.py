#!/usr/bin/env python3

import smtplib
from email.mime.text import MIMEText

"""sendemail.py: A email sender module"""

def send_email(recipient, subject, body, sender):
    envelope = MIMEText(body)
    envelope['Subject'] = subject
    envelope['From'] = sender;
    envelope['To'] = recipient

    server = smtplib.SMTP('localhost')
    server.send_message(envelope)
    server.quit

