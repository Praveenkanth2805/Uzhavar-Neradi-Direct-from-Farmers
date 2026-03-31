from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import secrets
from .utils import geocode_address

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('farmer', 'Farmer'),
        ('customer', 'Customer'),
        ('delivery', 'Delivery Partner'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=15, unique=True)
    is_approved = models.BooleanField(default=False)  # Admin approval
    approved_at = models.DateTimeField(null=True, blank=True)
    language = models.CharField(max_length=10, default='ta')  # ta, en
    # Farmer document
    land_photo = models.ImageField(upload_to='land_photos/', null=True, blank=True)
    # Delivery partner documents
    vehicle_photo = models.ImageField(upload_to='vehicle_photos/', null=True, blank=True)
    license_photo = models.ImageField(upload_to='licenses/', null=True, blank=True)
    upi_id = models.CharField(max_length=100, blank=True, null=True, help_text="UPI ID for receiving payments (farmers only)")
    address = models.TextField(blank=True, help_text="Full address for delivery/pickup")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_rejected = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        # If address changed and is not empty, geocode it
        if self.address and (not self.latitude or not self.longitude):
            lat, lng = geocode_address(self.address)
            if lat and lng:
                self.latitude = lat
                self.longitude = lng
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} - {self.role}"

# apps/users/models.py
import os, smtplib
from email.mime.text import MIMEText
from django.db import models
from django.utils import timezone
from django.conf import settings
from dotenv import load_dotenv
import secrets

def generate_otp():
    return secrets.token_hex(3).upper()

load_dotenv(os.path.join(settings.BASE_DIR, '.env'))  # safe load .env

class OTP(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6, default=generate_otp)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        return (not self.is_used and 
                (timezone.now() - self.created_at).total_seconds() < settings.OTP_EMAIL_TOKEN_VALIDITY)

    def send_via_email(self):
        EMAIL_USER = os.getenv("EMAIL_HOST_USER")
        EMAIL_PASS = os.getenv("EMAIL_HOST_PASSWORD")
        if not EMAIL_USER or not EMAIL_PASS:
            raise ValueError("EMAIL_HOST_USER or EMAIL_HOST_PASSWORD not set in .env")

        subject = "Your Uzhavar Neradi OTP Code"
        message = f"Hello {self.user.username},\n\nYour OTP code is: {self.code}\nIt expires in 10 minutes."

        msg = MIMEText(message)
        msg['Subject'] = subject
        msg['From'] = EMAIL_USER
        msg['To'] = self.user.email

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)

        print(f"OTP {self.code} sent to {self.user.email} ✅")