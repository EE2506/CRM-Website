from flask import current_app, render_template
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

class MailService:
    @staticmethod
    def send_email(subject, recipient, template, **kwargs):
        """
        Sends an email using SMTP settings from config.
        """
        if current_app.config['DEBUG']:
            current_app.logger.info(f"DEBUG MODE: Email to {recipient} NOT sent. Subject: {subject}")
            # Log the content for debugging
            # current_app.logger.debug(render_template(template, **kwargs))
            return True

        msg = MIMEMultipart()
        msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
        msg['To'] = recipient
        msg['Subject'] = subject

        body = render_template(template, **kwargs)
        msg.attach(MIMEText(body, 'html'))

        try:
            server = smtplib.SMTP(current_app.config['MAIL_SERVER'], current_app.config['MAIL_PORT'])
            server.starttls()
            server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            current_app.logger.error(f"Mail Error: {str(e)}")
            return False

    @staticmethod
    def send_activation_email(user, activation_url):
        return MailService.send_email(
            "Activate Your Account - SME POS",
            user.email,
            'emails/activation.html',
            user=user,
            activation_url=activation_url
        )

    @staticmethod
    def send_ticket_notification(ticket, recipient_email, message):
        return MailService.send_email(
            f"Update on Ticket {ticket.ticket_code}",
            recipient_email,
            'emails/ticket_update.html',
            ticket=ticket,
            message=message
        )
