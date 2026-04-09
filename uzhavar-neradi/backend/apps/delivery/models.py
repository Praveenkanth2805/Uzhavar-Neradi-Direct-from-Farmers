from django.db import models
from apps.users.models import User
from apps.orders.models import Order

class DeliveryAssignment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    delivery_partner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'delivery'})
    assigned_at = models.DateTimeField(auto_now_add=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=100, blank=True, null=True)